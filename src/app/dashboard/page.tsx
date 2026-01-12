
"use client";

import { useGroups } from "@/hooks/use-groups";
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    TouchSensor,
    MouseSensor,
    closestCenter,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
    DropAnimation,
    pointerWithin,
    rectIntersection,
    getFirstCollision,
    CollisionDetection,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState, useEffect, useCallback } from "react";
import { GroupCard } from "@/components/bookmarks/group-card";
import { BookmarkItem } from "@/components/bookmarks/bookmark-item";
import { BookmarkModal } from "@/components/bookmarks/bookmark-modal";
import { GroupModal } from "@/components/bookmarks/group-modal";
import { Plus, LogOut, Settings, ChevronDown, ChevronRight, ChevronsDown, ChevronsRight, ChevronsUp, WifiOff } from "lucide-react";
import { toast } from "sonner";

// ... inside DashboardPage

// Online Status State
const [isOnline, setIsOnline] = useState(true);

useEffect(() => {
    // Initial check
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
        setIsOnline(true);
        toast.success("Online: Syncing changes...");
        // Sync pending collapsed states if any (Not fully implemented yet, relying on re-fetch or next action)
        // Ideally we iterate local dirty state. For now, we trust swr revalidation or next action.
        mutate();
    };
    const handleOffline = () => {
        setIsOnline(false);
        toast.error("Offline Mode: Changes will not specify save.");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
}, [mutate]);

// ... existing handlers ...

const checkOnline = () => {
    if (!navigator.onLine) {
        toast.error("Offline: Feature unavailable.");
        return false;
    }
    return true;
};

const handleToggleCollapse = async (group: GroupWithBookmarks) => {
    const newCollapsedState = !group.isCollapsed;

    // Optimistic Update (Always allowed, even offline)
    const newGroups = groups?.map(g =>
        g.id === group.id ? { ...g, isCollapsed: newCollapsedState } : g
    );
    mutate(newGroups, false);

    // If offline, just return (optimistic update remains locally till refresh)
    if (!navigator.onLine) {
        // Optional: Store in localStorage to persist across reloads if strictly required.
        // For now, in-memory optimistic update is fine for "viewing".
        return;
    }

    try {
        await fetch(`/api/groups/${group.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isCollapsed: newCollapsedState }),
        });
    } catch (e) {
        console.error(e);
        mutate(); // Revert
    }
};

const handleToggleAll = async (collapsed: boolean) => {
    if (!groups) return;

    // Optimistic Update
    const newGroups = groups.map(g => ({ ...g, isCollapsed: collapsed }));
    mutate(newGroups, false);

    if (!navigator.onLine) return;

    try {
        await fetch("/api/groups/toggle-all", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ collapsed }),
        });
    } catch (e) {
        console.error(e);
        mutate();
    }
};

const handleAddGroupSubmit = async (name: string) => {
    if (!checkOnline()) return;
    try {
        await fetch("/api/groups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
        });
        mutate();
    } catch (e) {
        console.error(e);
        toast.error("Failed to create group");
    }
};

const handleEditGroupSubmit = async (name: string) => {
    if (!checkOnline()) return;
    if (!editingGroup) return;
    try {
        await fetch(`/api/groups/${editingGroup.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
        });
        mutate();
    } catch (e) {
        console.error(e);
    }
};

// ... confirmDelete ...
const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (!checkOnline()) return;

    try {
        // ... existing login
        if (deleteTarget.type === 'group') {
            await fetch(`/api/groups/${deleteTarget.id}`, { method: "DELETE" });
        } else {
            await fetch(`/api/bookmarks/${deleteTarget.id}`, { method: "DELETE" });
        }
        mutate();
    } catch (e) {
        console.error(e);
    } finally {
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
    }
};

// ... handleBookmarkSubmit ...
const handleBookmarkSubmit = async (data: { title: string; url: string; groupId?: string; id?: string }) => {
    if (!checkOnline()) return;
    try {
        // ... existing logic
        if (data.id) {
            await fetch(`/api/bookmarks/${data.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: data.title, url: data.url }),
            });
        } else {
            await fetch("/api/bookmarks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
        }
        mutate();
    } catch (e) {
        console.error(e);
        toast.error("Failed to save bookmark");
    }
};

// ... handleDragEnd ...
if (!checkOnline() && over) {
    // Prevent drop or revert immediately
    return;
}
// Actually hard to block DragEnd cleanly without UI revert flickers.
// Better to check inside handleDragEnd before API call and Revert.

const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);

    if (!over) return;
    if (active.id === over.id) return;

    if (!checkOnline()) return; // Stop here, UI will revert naturally because we don't apply optimistic update locally?? 
    // Wait, if we don't apply optimistic update, dnd-kit might visually revert or stay?
    // Let's rely on standard logic but block API and revert only?

    // Actually, preventing reorder completely is safer to avoid confusion.

    // ... existing drag logic ...
};

const handleTitleSave = async () => {
    if (!navigator.onLine) return; // Silent fail for title save
    try {
        await fetch("/api/user", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dashboardTitle }),
        });
    } catch (e) {
        console.error("Failed to save title", e);
    }
};

    // UI Header
    // ...
                     <div className="flex items-center gap-2">
                        {/* Offline Indicator */}
                        {!isOnline && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium animate-pulse">
                                <WifiOff size={14} />
                                <span className="hidden sm:inline">Offline</span>
                            </div>
                        )}
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
    // ...
                            <span className="font-bold text-white text-lg">{dashboardTitle.charAt(0).toUpperCase()}</span>
                        </div>
                        <input
                            value={dashboardTitle}
                            onChange={(e) => setDashboardTitle(e.target.value)}
                            onBlur={handleTitleSave}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleTitleSave();
                                    e.currentTarget.blur();
                                }
                            }}
                            className="bg-transparent border-none text-white font-bold tracking-tight text-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded px-2 py-1 min-w-[50px] max-w-[120px] sm:max-w-none truncate"
                            spellCheck={false}
                        />
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <button
                            onClick={() => handleToggleAll(true)}
                            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                            title="Collapse All"
                        >
                            <ChevronsUp size={16} />
                            <span className="hidden sm:inline">Collapse All</span>
                        </button>
                        <button
                            onClick={() => handleToggleAll(false)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                            title="Expand All"
                        >
                            <ChevronsDown size={16} />
                            <span className="hidden sm:inline">Expand All</span>
                        </button>
                        <div className="w-px h-4 bg-white/10 mx-2" />
                        <button
                            onClick={() => signOut()}
                            className="p-2 text-white/60 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div >
            </header >

            <main className="w-full px-8 py-8">
                <DndContext
                    sensors={sensors}
                    collisionDetection={collisionDetectionStrategy}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={groups?.map((g) => g.id) || []}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="flex flex-col gap-6 w-full max-w-[2000px] mx-auto">
                            {groups?.map((group) => (
                                <GroupCard
                                    key={group.id}
                                    group={group}
                                    onEditGroup={openEditGroup}
                                    onDeleteGroup={handleDeleteGroup}
                                    onAddBookmark={openAddBookmark}
                                    onEditBookmark={openEditBookmark}
                                    onDeleteBookmark={handleDeleteBookmark}
                                    onToggleCollapse={handleToggleCollapse}
                                />
                            ))}

                            <button
                                onClick={openAddGroup}
                                className="flex items-center justify-center h-[80px] rounded-2xl border-2 border-dashed border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all group"
                            >
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mr-3 group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-colors">
                                    <Plus size={20} className="text-white/60 group-hover:text-purple-300" />
                                </div>
                                <span className="font-medium text-white/60 group-hover:text-white">New Group</span>
                            </button>
                        </div>
                    </SortableContext>

                    <DragOverlay dropAnimation={dropAnimation}>
                        {activeType === "Group" && activeGroup && (
                            <GroupCard
                                group={activeGroup}
                                onEditGroup={() => { }}
                                onDeleteGroup={() => { }}
                                onAddBookmark={() => { }}
                                onEditBookmark={() => { }}
                                onDeleteBookmark={() => { }}
                                onToggleCollapse={() => { }}
                            />
                        )}
                        {activeType === "Bookmark" && activeBookmark && (
                            <div className="w-[300px]">
                                <BookmarkItem
                                    bookmark={activeBookmark}
                                    onEdit={() => { }}
                                    onDelete={() => { }}
                                />
                            </div>
                        )}
                    </DragOverlay>
                </DndContext>
            </main>

            <BookmarkModal
                isOpen={isBookmarkModalOpen}
                initialData={editingBookmark}
                targetGroupId={targetGroupId}
                onClose={() => setIsBookmarkModalOpen(false)}
                onSubmit={handleBookmarkSubmit}
            />

            <GroupModal
                isOpen={isGroupModalOpen}
                initialName={editingGroup?.name}
                title={editingGroup ? "Edit Group" : "New Group"}
                onClose={() => setIsGroupModalOpen(false)}
                onSubmit={editingGroup ? handleEditGroupSubmit : handleAddGroupSubmit}
            />

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                title={deleteTarget?.type === 'group' ? "Delete Group" : "Delete Bookmark"}
                message={
                    deleteTarget?.type === 'group'
                        ? (deleteTarget.bookmarksCount && deleteTarget.bookmarksCount > 0
                            ? `This group has ${deleteTarget.bookmarksCount} bookmarks.\nDeleting it will also remove all contained bookmarks.\n\nAre you sure you want to proceed?`
                            : "Are you sure you want to delete this group?")
                        : "Are you sure you want to delete this bookmark?"
                }
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
            />
        </div >
    );
}

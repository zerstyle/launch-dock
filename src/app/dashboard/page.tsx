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
import { Bookmark } from "@prisma/client";
import { signOut } from "next-auth/react";
import { GroupWithBookmarks } from "@/hooks/use-groups";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { toast } from "sonner";

export default function DashboardPage() {
    const { groups, isLoading, mutate } = useGroups();
    const [isMounted, setIsMounted] = useState(false);

    // Online Status State
    const [isOnline, setIsOnline] = useState(true);

    // Drag State
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeType, setActiveType] = useState<"Group" | "Bookmark" | null>(null);

    // Modal State
    const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
    const [targetGroupId, setTargetGroupId] = useState<string | undefined>(undefined);
    const [editingGroup, setEditingGroup] = useState<{ id: string, name: string } | null>(null);

    // Dashboard Title State
    const [dashboardTitle, setDashboardTitle] = useState("Favorites");

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string, type: 'group' | 'bookmark', bookmarksCount?: number } | null>(null);

    useEffect(() => {
        setIsMounted(true);
        // Initial check
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            toast.success("Online: Syncing changes...");
            mutate();
        };
        const handleOffline = () => {
            setIsOnline(false);
            toast.error("Offline Mode: Changes will not specify save.");
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Fetch User Data (Dashboard Title)
        fetch("/api/user")
            .then(res => res.json())
            .then(data => {
                if (data.dashboardTitle) {
                    setDashboardTitle(data.dashboardTitle);
                }
            })
            .catch(err => console.error("Failed to load user settings", err));

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [mutate]);

    const checkOnline = () => {
        if (!navigator.onLine) {
            toast.error("Offline: Feature unavailable.");
            return false;
        }
        return true;
    };

    const handleTitleSave = async () => {
        if (!navigator.onLine) return;
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

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Custom Collision Detection
    const collisionDetectionStrategy: CollisionDetection = useCallback(
        (args) => {
            if (activeType === "Group") {
                return closestCenter(args);
            }

            const pointerCollisions = pointerWithin(args);
            const groupCollision = pointerCollisions.find((c) => c.data?.current?.type === "Group");
            if (groupCollision) {
                return [groupCollision];
            }

            return rectIntersection(args);
        },
        [activeType]
    );

    if (!isMounted) return <div className="min-h-screen bg-slate-950" />;
    if (isLoading) return <div className="min-h-screen flex items-center justify-center text-white bg-slate-950">Loading...</div>;

    // --- Handlers ---
    const handleToggleCollapse = async (group: GroupWithBookmarks) => {
        const newCollapsedState = !group.isCollapsed;

        // Optimistic Update (Always allowed, even offline)
        const newGroups = groups?.map(g =>
            g.id === group.id ? { ...g, isCollapsed: newCollapsedState } : g
        );
        mutate(newGroups, false);

        if (!navigator.onLine) return;

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

    const handleDeleteGroup = (id: string) => {
        const group = groups?.find(g => g.id === id);
        if (!group) return;

        setDeleteTarget({
            id,
            type: 'group',
            bookmarksCount: group.bookmarks.length
        });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        if (!checkOnline()) return;

        try {
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

    const openAddGroup = () => {
        setEditingGroup(null);
        setIsGroupModalOpen(true);
    }

    const openEditGroup = (id: string, name: string) => {
        setEditingGroup({ id, name });
        setIsGroupModalOpen(true);
    };

    // Bookmark Handlers
    const openAddBookmark = (groupId: string) => {
        setTargetGroupId(groupId);
        setEditingBookmark(null);
        setIsBookmarkModalOpen(true);
    };

    const openEditBookmark = (bookmark: Bookmark) => {
        setEditingBookmark(bookmark);
        setIsBookmarkModalOpen(true);
    }

    const handleDeleteBookmark = (id: string) => {
        setDeleteTarget({ id, type: 'bookmark' });
        setIsDeleteModalOpen(true);
    }

    const handleBookmarkSubmit = async (data: { title: string; url: string; groupId?: string; id?: string }) => {
        if (!checkOnline()) return;
        try {
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

    // --- Drag Handlers ---
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        setActiveType(event.active.data.current?.type);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        // Only handle Bookmark drag
        const isActiveBookmark = active.data.current?.type === "Bookmark";
        if (!isActiveBookmark) return;

        const activeGroup = groups?.find(g => g.bookmarks.some((b: Bookmark) => b.id === activeId));
        if (!activeGroup) return;

        // 1. Over a Bookmark
        const isOverBookmark = over.data.current?.type === "Bookmark";
        if (isOverBookmark) {
            const overGroup = groups?.find(g => g.bookmarks.some((b: Bookmark) => b.id === overId));
            if (!overGroup) return;

            if (activeGroup.id !== overGroup.id) {
                const activeItems = activeGroup.bookmarks;
                const overItems = overGroup.bookmarks;
                const activeIndex = activeItems.findIndex((b: Bookmark) => b.id === activeId);
                const overIndex = overItems.findIndex((b: Bookmark) => b.id === overId);

                let newIndex;
                if (over.data.current?.sortable?.index != null) {
                    newIndex = over.data.current?.sortable?.index;
                } else {
                    newIndex = overIndex >= 0 ? overIndex + 1 : overItems.length + 1;
                }

                // Create new state
                const newGroups = groups!.map(g => {
                    if (g.id === activeGroup.id) {
                        return {
                            ...g,
                            bookmarks: g.bookmarks.filter((b: Bookmark) => b.id !== activeId)
                        };
                    }
                    if (g.id === overGroup.id) {
                        const newBookmarks = [...g.bookmarks];
                        const activeBookmark = activeGroup.bookmarks[activeIndex];
                        const movedBookmark = { ...activeBookmark, groupId: overGroup.id };
                        const insertIndex = overIndex >= 0 ? overIndex : newBookmarks.length;
                        newBookmarks.splice(insertIndex, 0, movedBookmark);

                        return { ...g, bookmarks: newBookmarks };
                    }
                    return g;
                });

                mutate(newGroups, false);
            }
        }

        // 2. Over a Group (Empty or not)
        const isOverGroup = over.data.current?.type === "Group";
        if (isOverGroup) {
            const overGroup = groups?.find(g => g.id === overId);
            if (!overGroup) return;

            if (activeGroup.id !== overGroup.id) {
                const activeItems = activeGroup.bookmarks;
                const activeIndex = activeItems.findIndex((b: Bookmark) => b.id === activeId);
                const activeBookmark = activeItems[activeIndex];
                const movedBookmark = { ...activeBookmark, groupId: overGroup.id };

                const newGroups = groups!.map(g => {
                    if (g.id === activeGroup.id) {
                        return {
                            ...g,
                            bookmarks: g.bookmarks.filter((b: Bookmark) => b.id !== activeId)
                        };
                    }
                    if (g.id === overGroup.id) {
                        if (g.bookmarks.find((b: Bookmark) => b.id === activeId)) return g;
                        return {
                            ...g,
                            bookmarks: [...g.bookmarks, movedBookmark]
                        };
                    }
                    return g;
                });

                mutate(newGroups, false);
            }
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveType(null);

        if (!over) return;
        if (active.id === over.id) return;

        if (!checkOnline()) return;

        // 1. Group Sorting
        if (active.data.current?.type === "Group" && over.data.current?.type === "Group") {
            const oldIndex = groups?.findIndex(g => g.id === active.id) ?? -1;
            const newIndex = groups?.findIndex(g => g.id === over.id) ?? -1;

            if (oldIndex !== -1 && newIndex !== -1 && groups) {
                const newGroups = arrayMove(groups, oldIndex, newIndex);
                mutate(newGroups, false);

                const reorderedItems = newGroups.map((g, index) => ({
                    id: g.id,
                    order: index
                }));

                try {
                    await fetch("/api/reorder", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ type: "group", items: reorderedItems }),
                    });
                } catch (e) {
                    mutate();
                }
            }
            return;
        }

        // 2. Bookmark Sorting
        if (active.data.current?.type === "Bookmark") {
            const activeBookmarkId = active.id as string;
            const overId = over.id as string;

            const findGroupOfBookmark = (bId: string) => groups?.find(g => g.bookmarks.some((b: Bookmark) => b.id === bId));
            const findGroupById = (gId: string) => groups?.find(g => g.id === gId);

            const sourceGroup = findGroupOfBookmark(activeBookmarkId);
            const destGroup = findGroupById(overId) || findGroupOfBookmark(overId);

            if (!sourceGroup || !destGroup) return;

            const newGroups = groups!.map(g => ({ ...g, bookmarks: [...g.bookmarks] }));
            const sourceGroupMutable = newGroups.find(g => g.id === sourceGroup.id)!;
            const destGroupMutable = newGroups.find(g => g.id === destGroup.id)!;

            if (sourceGroup.id === destGroup.id) {
                const sourceIndex = sourceGroupMutable.bookmarks.findIndex((b: Bookmark) => b.id === activeBookmarkId);
                const overIndex = destGroupMutable.bookmarks.findIndex((b: Bookmark) => b.id === overId);

                if (sourceIndex !== -1 && overIndex !== -1) {
                    destGroupMutable.bookmarks = arrayMove(destGroupMutable.bookmarks, sourceIndex, overIndex);
                }
            } else {
                const sourceIndex = sourceGroupMutable.bookmarks.findIndex((b: Bookmark) => b.id === activeBookmarkId);
                const [movedBookmark] = sourceGroupMutable.bookmarks.splice(sourceIndex, 1);
                movedBookmark.groupId = destGroup.id;

                if (over.data.current?.type === "Group") {
                    destGroupMutable.bookmarks.push(movedBookmark);
                } else {
                    const overIndex = destGroupMutable.bookmarks.findIndex((b: Bookmark) => b.id === overId);
                    if (overIndex >= 0) {
                        destGroupMutable.bookmarks.splice(overIndex, 0, movedBookmark);
                    } else {
                        destGroupMutable.bookmarks.push(movedBookmark);
                    }
                }
            }

            mutate(newGroups, false);

            const updates: { id: string; order: number; groupId: string }[] = [];

            if (sourceGroup.id !== destGroup.id) {
                sourceGroupMutable.bookmarks.forEach((b: Bookmark, idx: number) => {
                    updates.push({ id: b.id, order: idx, groupId: sourceGroup.id });
                });
            }

            destGroupMutable.bookmarks.forEach((b: Bookmark, idx: number) => {
                updates.push({ id: b.id, order: idx, groupId: destGroup.id });
            });

            try {
                await fetch("/api/reorder", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: "bookmark", items: updates }),
                });
            } catch (e) {
                mutate();
            }
        }
    };

    const activeGroup = groups?.find((g) => g.id === activeId);
    let activeBookmark: Bookmark | undefined;
    if (activeType === "Bookmark") {
        for (const group of groups || []) {
            const found = group.bookmarks.find((b: Bookmark) => b.id === activeId);
            if (found) {
                activeBookmark = found;
                break;
            }
        }
    }

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    return (
        <div className="min-h-screen bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] text-white">
            <header className="sticky top-0 z-40 w-full backdrop-blur-xl border-b border-white/5 bg-black/20">
                <div className="w-full px-4 sm:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Offline Indicator */}
                        {!isOnline && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium animate-pulse">
                                <WifiOff size={14} />
                                <span className="hidden sm:inline">Offline</span>
                            </div>
                        )}
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
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
                </div>
            </header>

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
        </div>
    );
}


import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GroupWithBookmarks } from "@/hooks/use-groups";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { BookmarkItem } from "./bookmark-item";
import { GripHorizontal, Pencil, Plus, Trash2, X, Check, ChevronDown, ChevronRight, ChevronUp, ExternalLink } from "lucide-react";
import { Bookmark } from "@prisma/client";
import { useState } from "react";

interface GroupCardProps {
    group: GroupWithBookmarks;
    onEditGroup: (id: string, name: string) => void;
    onDeleteGroup: (id: string) => void;
    onAddBookmark: (groupId: string) => void;
    onEditBookmark: (bookmark: Bookmark) => void;
    onDeleteBookmark: (id: string) => void;
    onToggleCollapse: (group: GroupWithBookmarks) => void;
}

export function GroupCard({
    group,
    onEditGroup,
    onDeleteGroup,
    onAddBookmark,
    onEditBookmark,
    onDeleteBookmark,
    onToggleCollapse,
}: GroupCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: group.id,
        data: {
            type: "Group",
            group,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const handleOpenAllBookmarks = (e: React.MouseEvent) => {
        e.stopPropagation();
        const bookmarks = group.bookmarks;
        if (!bookmarks || bookmarks.length === 0) return;

        bookmarks.forEach((bookmark) => {
            window.open(bookmark.url, "_blank");
        });
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className={`flex flex-col rounded-2xl bg-white/5 border border-white/20 p-4 opacity-50 ${group.isCollapsed ? 'h-[74px]' : 'h-[300px]'}`}
            />
        )
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex flex-col rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-md transition-all duration-300 hover:border-white/20 ${group.isCollapsed ? 'h-auto' : 'min-h-[120px]'}`}
        >
            <div className="flex items-center justify-between group/header">
                <div className="flex items-center gap-2 flex-1">
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-move text-white/40 hover:text-white/80 p-1 rounded hover:bg-white/5"
                    >
                        <GripHorizontal size={18} />
                    </div>

                    <h2
                        className="font-semibold text-white/90 truncate select-none cursor-pointer"
                        onDoubleClick={() => onEditGroup(group.id, group.name)}
                        onClick={() => onToggleCollapse(group)}
                    >
                        {group.name}
                    </h2>
                </div>

                <div className="flex items-center gap-1">
                    <div className="flex gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
                        <button
                            onClick={handleOpenAllBookmarks}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-blue-400"
                            title="Open All In New Tabs"
                        >
                            <ExternalLink size={16} />
                        </button>
                        <button
                            onClick={() => onEditGroup(group.id, group.name)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-blue-400"
                        >
                            <Pencil size={16} />
                        </button>
                        <button
                            onClick={() => onDeleteGroup(group.id)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-red-400"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                    <button
                        onClick={() => onToggleCollapse(group)}
                        className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded transition-colors"
                    >
                        {group.isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </button>
                </div>
            </div>

            {!group.isCollapsed && (
                <>
                    <div className="mt-4 flex-1 min-h-[50px]">
                        <SortableContext
                            items={group.bookmarks.map((b: Bookmark) => b.id)}
                            strategy={rectSortingStrategy}
                        >
                            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>

                                {group.bookmarks.map((bookmark: Bookmark) => (
                                    <BookmarkItem
                                        key={bookmark.id}
                                        bookmark={bookmark}
                                        onEdit={onEditBookmark}
                                        onDelete={onDeleteBookmark}
                                    />
                                ))}

                                <button
                                    onClick={() => onAddBookmark(group.id)}
                                    className="flex items-center justify-center p-2 rounded-xl bg-white/5 border border-dashed border-white/10 hover:border-white/30 hover:bg-white/10 transition-all h-[56px]"
                                >
                                    <Plus size={20} className="text-white/40 group-hover:text-purple-300" />
                                </button>
                            </div>
                        </SortableContext>
                    </div>
                </>
            )}
        </div>
    );
}

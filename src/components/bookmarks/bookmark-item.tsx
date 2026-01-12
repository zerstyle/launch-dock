
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bookmark } from "@prisma/client";
import { GripVertical, Pencil, Trash2, Globe } from "lucide-react";
import Image from "next/image";

interface BookmarkItemProps {
    bookmark: Bookmark;
    onEdit: (bookmark: Bookmark) => void;
    onDelete: (id: string) => void;
}

export function BookmarkItem({ bookmark, onEdit, onDelete }: BookmarkItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: bookmark.id,
        data: {
            type: "Bookmark",
            bookmark,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="relative flex items-center p-3 rounded-xl bg-white/10 border border-white/20 shadow-lg opacity-50 z-50 h-[64px]"
            >
                <div className="w-10 h-10 rounded-lg bg-white/10 mr-3" />
                <div className="h-4 w-24 bg-white/10 rounded" />
            </div>
        )
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group relative flex items-center p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 backdrop-blur-sm h-[56px]"
        >
            <div
                {...attributes}
                {...listeners}
                className="mr-1 text-white/40 hover:text-white/80 cursor-grab active:cursor-grabbing p-1 hover:bg-white/5 rounded"
            >
                <GripVertical size={14} />
            </div>

            <div className="relative w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mr-2 overflow-hidden shrink-0">
                <Image
                    src={`https://www.google.com/s2/favicons?sz=64&domain_url=${bookmark.url}`}
                    alt={bookmark.title}
                    width={20}
                    height={20}
                    className="opacity-90"
                    unoptimized
                />
            </div>

            <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-sm font-medium text-white/90 hover:text-purple-300 transition-colors"
                title={bookmark.title}
            >
                {bookmark.title}
            </a>

            <div className="absolute right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1a1a1a]/80 backdrop-blur-sm rounded-lg p-0.5">
                <button
                    onClick={(e) => { e.preventDefault(); onEdit(bookmark); }}
                    className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-blue-400 transition-colors"
                >
                    <Pencil size={13} />
                </button>
                <button
                    onClick={(e) => { e.preventDefault(); onDelete(bookmark.id); }}
                    className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-red-400 transition-colors"
                >
                    <Trash2 size={13} />
                </button>
            </div>
        </div>
    );
}

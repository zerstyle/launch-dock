
import useSWR from "swr";
import { Group, Bookmark } from "@prisma/client";

// Define the shape of data returned by the API
// API returns groups with included bookmarks
export type GroupWithBookmarks = Group & {
    bookmarks: Bookmark[];
    isCollapsed: boolean;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useGroups() {
    const { data, error, isLoading, mutate } = useSWR<GroupWithBookmarks[]>(
        "/api/groups",
        fetcher
    );

    return {
        groups: data,
        isLoading,
        isError: error,
        mutate,
    };
}

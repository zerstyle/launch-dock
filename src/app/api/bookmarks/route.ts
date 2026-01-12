
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// GET은 그룹 조회 시 같이 가져오므로 별도 구현 불필요할 수 있으나, 전체 검색 등을 위해 필요할 수도 있음.
// 여기서는 생성만 구현.
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const { title, url, groupId } = await req.json();

        if (!title || !url || !groupId) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        // Verify group ownership
        const groupOwner = await prisma.group.findUnique({
            where: { id: groupId, userId: session.user.id },
        });

        if (!groupOwner) {
            return new NextResponse("Group not found or unauthorized", { status: 404 });
        }

        // Find last order in the group
        const lastBookmark = await prisma.bookmark.findFirst({
            where: { groupId },
            orderBy: { order: "desc" },
        });

        const newOrder = lastBookmark ? lastBookmark.order + 1 : 0;

        const bookmark = await prisma.bookmark.create({
            data: {
                title,
                url,
                groupId,
                order: newOrder,
            },
        });

        return NextResponse.json(bookmark);
    } catch (error) {
        console.error("[BOOKMARK_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

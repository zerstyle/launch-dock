
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const { id } = await params;
        const { title, url, order, groupId } = await req.json();

        // Verify ownership via existing bookmark -> group -> user lookup
        // or just check if the bookmark belongs to a group owned by user.
        // Efficient way:
        const bookmark = await prisma.bookmark.findUnique({
            where: { id },
            include: { group: true },
        });

        if (!bookmark || bookmark.group.userId !== session.user.id) {
            return new NextResponse("Not Found", { status: 404 });
        }

        // If changing group, verify target group ownership
        if (groupId && groupId !== bookmark.groupId) {
            const targetGroup = await prisma.group.findUnique({
                where: { id: groupId, userId: session.user.id },
            });
            if (!targetGroup) {
                return new NextResponse("Target group not found", { status: 404 });
            }
        }

        const updatedBookmark = await prisma.bookmark.update({
            where: { id },
            data: {
                title: title ?? undefined,
                url: url ?? undefined,
                order: order ?? undefined,
                groupId: groupId ?? undefined,
            },
        });

        return NextResponse.json(updatedBookmark);
    } catch (error) {
        console.error("[BOOKMARK_PUT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const { id } = await params;

        const bookmark = await prisma.bookmark.findUnique({
            where: { id },
            include: { group: true },
        });

        if (!bookmark || bookmark.group.userId !== session.user.id) {
            return new NextResponse("Not Found", { status: 404 });
        }

        await prisma.bookmark.delete({
            where: { id },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[BOOKMARK_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

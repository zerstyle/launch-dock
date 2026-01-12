
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
        const { name, order, isCollapsed } = await req.json();

        // Validate ownership
        const group = await prisma.group.findUnique({
            where: { id },
        });

        if (!group) {
            return new NextResponse("Group not found", { status: 404 });
        }

        if (group.userId !== session.user.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const updatedGroup = await prisma.group.update({
            where: { id },
            data: {
                name: name === undefined ? undefined : name,
                order: order === undefined ? undefined : order,
                isCollapsed: isCollapsed === undefined ? undefined : isCollapsed,
            },
        });

        return NextResponse.json(updatedGroup);
    } catch (error) {
        console.error("[GROUP_PUT]", error);
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

        // Verify ownership
        const group = await prisma.group.findUnique({
            where: { id, userId: session.user.id },
        });

        if (!group) {
            return new NextResponse("Not Found", { status: 404 });
        }

        // Use transaction to delete bookmarks first, then the group
        // This ensures deletion works even if database cascade is not configured correctly
        await prisma.$transaction([
            prisma.bookmark.deleteMany({
                where: { groupId: id },
            }),
            prisma.group.delete({
                where: { id },
            }),
        ]);

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[GROUP_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

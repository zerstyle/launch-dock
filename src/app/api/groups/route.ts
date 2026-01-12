
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const groups = await prisma.group.findMany({
            where: { userId: session.user.id },
            include: {
                bookmarks: {
                    orderBy: { order: "asc" },
                },
            },
            orderBy: { order: "asc" },
        });

        return NextResponse.json(groups);
    } catch (error) {
        console.error("[GROUPS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const { name } = await req.json();

        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
        }

        // Find the last order to append the new group
        const lastGroup = await prisma.group.findFirst({
            where: { userId: session.user.id },
            orderBy: { order: "desc" },
        });

        const newOrder = lastGroup ? lastGroup.order + 1 : 0;

        const group = await prisma.group.create({
            data: {
                name,
                userId: session.user.id,
                order: newOrder,
            },
        });

        return NextResponse.json(group);
    } catch (error) {
        console.error("[GROUPS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

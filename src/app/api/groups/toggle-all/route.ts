import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { collapsed } = await request.json();

        if (typeof collapsed !== 'boolean') {
            return new NextResponse("Invalid body", { status: 400 });
        }

        await prisma.group.updateMany({
            where: {
                userId: session.user.id,
            },
            data: {
                isCollapsed: collapsed,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[GROUPS_TOGGLE_ALL]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

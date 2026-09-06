import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createDatabaseBackup, backupDir } from "@/lib/db";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const downloadFilename = searchParams.get("download");

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    if (downloadFilename) {
      // Validate filename to prevent directory traversal
      const safeFilename = path.basename(downloadFilename);
      const filePath = path.join(backupDir, safeFilename);

      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: "Backup file not found" }, { status: 404 });
      }

      const fileBuffer = fs.readFileSync(filePath);
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Disposition": `attachment; filename="${safeFilename}"`,
          "Content-Type": "application/x-sqlite3",
        },
      });
    }

    const files = fs.readdirSync(backupDir)
      .filter((f) => f.endsWith(".db"))
      .map((f) => {
        const fullPath = path.join(backupDir, f);
        const stat = fs.statSync(fullPath);
        return {
          filename: f,
          size: stat.size,
          created_at: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ backups: files });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to list backups" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const backupResult = createDatabaseBackup();

    return NextResponse.json({
      success: true,
      backup: {
        filename: backupResult.filename,
        size: backupResult.size,
        created_at: new Date().toISOString(),
      },
      message: `Database snapshot saved successfully as '${backupResult.filename}'.`,
    });
  } catch (error: any) {
    console.error("Backup error:", error);
    return NextResponse.json({ error: error.message || "Failed to create database backup" }, { status: 500 });
  }
}

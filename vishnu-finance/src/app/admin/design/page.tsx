import { ThemeEditor } from "@/components/admin/design/theme-editor"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Design System | Finance Admin",
    description: "Manage global application theme and branding.",
}

export default function DesignPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Design System</h2>
                <p className="text-muted-foreground">
                    Customize the look and feel of your application locally.
                </p>
            </div>
            <ThemeEditor />
        </div>
    )
}

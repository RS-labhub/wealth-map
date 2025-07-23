"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PropertyExport from "./property-export"
import CustomReports from "./custom-reports"
import ScheduledReports from "./scheduled-reports"
import ExportHistory from "./export-history"
import { Card } from "@/components/ui/card"

export default function ReportingDashboard() {
  const [activeTab, setActiveTab] = useState("export")

  return (
    <Card className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="export">Property Export</TabsTrigger>
          <TabsTrigger value="custom">Custom Reports</TabsTrigger>
          <TabsTrigger value="history">Export History</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="mt-6">
          <PropertyExport />
        </TabsContent>

        <TabsContent value="custom" className="mt-6">
          <CustomReports />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <ExportHistory />
        </TabsContent>
      </Tabs>
    </Card>
  )
}

"use client"

import { useState, useEffect } from "react"
import { FileText, Download, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { getExportHistory } from "@/lib/api/reports"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Report {
  id: string
  title: string
  description: string
  reportType: string
  createdAt: string
  notes: string
}

export function AccountDocuments() {
  const [reports, setReports] = useState<Report[]>([])
  const [selectedReports, setSelectedReports] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [viewReport, setViewReport] = useState<Report | null>(null)
  const [reportContent, setReportContent] = useState<any>(null)

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await getExportHistory();
        setReports(data);
      } catch (error) {
        console.error('Error fetching reports:', error);
        toast({
          title: "Error",
          description: "Failed to load reports",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, []);

  const toggleSelectAll = () => {
    if (selectedReports.length === reports.length) {
      setSelectedReports([])
    } else {
      setSelectedReports(reports.map((report) => report.id))
    }
  }

  const toggleReportSelection = (id: string) => {
    if (selectedReports.includes(id)) {
      setSelectedReports(selectedReports.filter((reportId) => reportId !== id))
    } else {
      setSelectedReports([...selectedReports, id])
    }
  }

  const handleDownload = async (report: Report) => {
    try {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `${report.title}.${report.reportType}`;

      // Create a blob from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger the download
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Download started",
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: "Error",
        description: "Failed to download report",
        variant: "destructive",
      });
    }
  };

  const handleDownloadSelected = async () => {
    for (const reportId of selectedReports) {
      const report = reports.find(r => r.id === reportId);
      if (report) {
        await handleDownload(report);
      }
    }
  };

  const handleDownloadAll = async () => {
    for (const report of reports) {
      await handleDownload(report);
    }
  };

  const handleView = async (report: Report) => {
    try {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch report content');
      }

      const content = await response.text();
      setReportContent(content);
      setViewReport(report);
    } catch (error) {
      console.error('Error viewing report:', error);
      toast({
        title: "Error",
        description: "Failed to view report",
        variant: "destructive",
      });
    }
  };

  const filteredReports = reports.filter(
    (report) =>
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div>
        <h2 className="text-xl font-semibold">Generated Reports</h2>
        <p className="text-sm text-muted-foreground mt-1">Access and download your generated reports</p>
      </div>

      <Separator className="my-6" />

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <Input
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="w-full md:w-48">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="tax">Tax</SelectItem>
                <SelectItem value="valuation">Valuation</SelectItem>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="portfolio">Portfolio</SelectItem>
                <SelectItem value="risk">Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="bg-green-500 hover:bg-green-600 flex items-center gap-2"
            disabled={selectedReports.length === 0}
            onClick={handleDownloadSelected}
          >
            <Download className="h-4 w-4" />
            Download Selected ({selectedReports.length})
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleDownloadAll}
          >
            <Download className="h-4 w-4" />
            Download All
          </Button>
        </div>
      </Card>

      <Dialog open={!!viewReport} onOpenChange={() => setViewReport(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{viewReport?.title}</DialogTitle>
            <div className="space-y-2">
              <DialogDescription>
                {viewReport?.description}
              </DialogDescription>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-muted/50">
                  {viewReport?.reportType}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Generated on {viewReport && new Date(viewReport.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
            {viewReport?.reportType.toLowerCase() === 'csv' ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <tbody>
                    {reportContent?.split('\n').map((row: string, rowIndex: number) => (
                      <tr key={rowIndex} className={rowIndex === 0 ? 'bg-muted/50' : ''}>
                        {row.split(',').map((cell: string, cellIndex: number) => (
                          <td key={cellIndex} className="border p-2">
                            {cell.replace(/^"|"$/g, '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : viewReport?.reportType.toLowerCase() === 'json' ? (
              <pre className="whitespace-pre-wrap break-words">
                {JSON.stringify(JSON.parse(reportContent || '{}'), null, 2)}
              </pre>
            ) : (
              <pre className="whitespace-pre-wrap break-words">{reportContent}</pre>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <div className="mt-6">
        <div className="bg-muted/50 p-4 border-b">
          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-1">
              <Checkbox
                checked={selectedReports.length === reports.length && reports.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </div>
            <div className="col-span-5 font-medium">Report Name</div>
            <div className="col-span-2 font-medium">Category</div>
            <div className="col-span-2 font-medium">Generated</div>
            <div className="col-span-2 font-medium text-right">Actions</div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Loading reports...</p>
          </div>
        ) : filteredReports.length > 0 ? (
          filteredReports.map((report) => (
            <div key={report.id} className="p-4 border-b last:border-0 hover:bg-muted/30">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-1">
                  <Checkbox
                    checked={selectedReports.includes(report.id)}
                    onCheckedChange={() => toggleReportSelection(report.id)}
                  />
                </div>
                <div className="col-span-5">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{report.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {report.reportType.toUpperCase()} • {report.description}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <Badge variant="outline" className="bg-muted/50">
                    {report.reportType}
                  </Badge>
                </div>
                <div className="col-span-2 text-sm">
                  {new Date(report.createdAt).toLocaleDateString()}
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    title="View"
                    onClick={() => handleView(report)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    title="Download"
                    onClick={() => handleDownload(report)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No reports found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  )
}

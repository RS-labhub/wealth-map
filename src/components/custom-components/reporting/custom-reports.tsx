"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { capitalizeFirstLetter, Property } from "@/Models/models"
import usePropertyStore from "@/stores/propertyStore"
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart as ReLineChart,
  Line
} from "recharts";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PropertyService from "@/services/propertyService"
import { BarChart, PieChart, LineChart, Save, Share, Download, Plus, Trash2, Search } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

import html2canvas from 'html2canvas-pro'; // Make sure you have the latest version or html2canvas-pro installed
import jsPDF from 'jspdf';
import { format } from "date-fns"
import { Report } from "@/Models/models"
import { createReport } from "@/lib/api/reports"

interface ReportChartRendererProps {
  report: Report;
  availableFields: { id: string; label: string }[];
  trendingProperties: Property[]; // Use the Property interface here
  COLORS: string[];
  isDownloadPreview?: boolean; // New prop to adjust rendering for download
}

const ReportChartRenderer: React.FC<ReportChartRendererProps> = ({
  report,
  availableFields,
  trendingProperties,
  COLORS,
  isDownloadPreview = false,
}) => {
  // Helper function to parse numerical values from property data
  const parseValue = (value: string | number | undefined): number => {
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^0-9.]/g, ""));
      return isNaN(parsed) ? 0 : parsed;
    }
    return typeof value === 'number' ? value : 0;
  };

  // Helper to truncate long names for legends/labels
  // Increased maxLength for better readability in PDF, adjust if needed
  const truncateName = (name: string, maxLength: number = 25): string => {
    if (name.length > maxLength) {
      return name.substring(0, maxLength - 3) + "...";
    }
    return name;
  };

  // Custom Tooltip for Bar and Line Charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Find the original property data if available for full address
      // Use trendingProperties as source for the full address
      const originalProp = trendingProperties.find(p => p.address.startsWith(label));
      const displayLabel = originalProp ? originalProp.address : label;

      return (
        <div className="bg-white p-2 border border-gray-300 rounded shadow-md text-sm">
          <p className="font-bold mb-1">{displayLabel}</p>
          {payload.map((entry: any, index: number) => {
            const fieldLabel = availableFields.find(f => f.id === entry.dataKey)?.label || entry.dataKey;
            return (
              <p key={`item-${index}`} style={{ color: entry.color }}>
                {`${fieldLabel}: ${entry.value}`}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Data preparation logic for Recharts
  const getChartData = useCallback(() => {
    // Only filter for properties *selected in this report*
    const propertiesForReport = trendingProperties.filter(p => report.properties.includes(p.id));

    if (report.type === "pie") {
      return report.fields.map(field => {
        let chartData: { name: string; value: number; color: string }[] = [];

        if (field === "confidenceLevel") {
          const confidenceMap = new Map<string, number>();
          propertiesForReport.forEach((prop) => {
            const level = prop.confidence || "Unknown";
            confidenceMap.set(level, (confidenceMap.get(level) || 0) + 1);
          });
          chartData = Array.from(confidenceMap.entries()).map(([name, value], idx) => ({
            name,
            value,
            color: COLORS[idx % COLORS.length],
          }));
        } else {
          chartData = propertiesForReport.map((prop, idx) => {
            const propertyName = prop.address || `Property ${prop.id}`;
            const rawValue = (prop as Record<string, any>)?.[field === "Price" ? "value" : field];
            const value = parseValue(rawValue);

            return {
              name: truncateName(propertyName, 20),
              value,
              color: COLORS[idx % COLORS.length],
            };
          });
          // Filter out items with zero value if they make the chart unreadable
          chartData = chartData.filter(item => item.value > 0);
        }
        return { field, data: chartData };
      });
    } else { // bar or line chart
      return propertiesForReport.map((prop) => {
        const data: any = { name: truncateName(prop.address || `Property ${prop.id}`, isDownloadPreview ? 20 : 15) };
        report.fields.forEach((field) => {
          data[field] = parseValue((prop as Record<string, any>)?.[field === "Price" ? "value" : field]);
        });
        return data;
      });
    }
  }, [report, trendingProperties, COLORS, isDownloadPreview]); // Dependencies for useCallback

  const chartData = getChartData();

  // Condition to show "No data" message
  const hasData = (report.type === "pie") ?
    (chartData as { field: string; data: any[] }[]).some(item => item.data.length > 0) :
    (chartData as any[]).length > 0;

  if (report.properties.length === 0 || report.fields.length === 0 || !hasData) {
    return (
      <div className="text-center p-8 text-gray-500">
        No data available to render this chart.
      </div>
    );
  }

  return (
    <>
      {report.type === "pie" ? (
        // Adjusted grid layout for better spacing in PDF
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {(chartData as { field: string; data: any[] }[]).map((pieChart: any) => (
            <div key={pieChart.field} className="min-w-0">
              <h4 className="text-center mb-2 text-md font-semibold">
                {availableFields.find(f => f.id === pieChart.field)?.label} Distribution
              </h4>
              {pieChart.data.length > 0 ? (
                // Adjusted height for pie chart to ensure legend fits
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart margin={isDownloadPreview ? { top: 20, right: 100, bottom: 20, left: 20 } : { top: 20, right: 20, bottom: 20, left: 20 }}>
                      <Pie
                        data={pieChart.data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                      >
                        {pieChart.data.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="top" // Adjusted to 'top' for better vertical distribution
                        wrapperStyle={{
                          paddingLeft: '10px',
                          maxHeight: isDownloadPreview ? 200 : '100%', // Fixed max height for download, scrollable
                          overflowY: isDownloadPreview ? 'auto' : 'hidden', // Auto scroll for download
                          width: isDownloadPreview ? 150 : 'auto', // Fixed width for download to help wrapping
                          fontSize: isDownloadPreview ? '10px' : '12px', // Smaller font for download
                          wordBreak: 'break-word', // Ensure long words break
                        }}
                        formatter={(value, entry) => (
                          <span className="text-sm">{truncateName(value as string, isDownloadPreview ? 25 : 30)}</span>
                        )}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-gray-500">No data for this chart.</p>
              )}
            </div>
          ))}
        </div>
      ) : report.type === "bar" ? (
        <div className="w-full max-w-3xl h-[300px] bg-gray-100 rounded-md flex items-center justify-center">
          <ResponsiveContainer width="100%" height={250}>
            <ReBarChart
              data={chartData as any[]}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis dataKey="name" interval={0} angle={-30} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {report.fields.map((field, idx) => (
                <Bar key={field} dataKey={field} fill={COLORS[idx % COLORS.length]} />
              ))}
            </ReBarChart>
          </ResponsiveContainer>
        </div>
      ) : ( // line chart
        <div className="w-full max-w-3xl h-[300px] bg-gray-100 rounded-md flex items-center justify-center">
          <ResponsiveContainer width="100%" height={250}>
            <ReLineChart
              data={chartData as any[]}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis dataKey="name" interval={0} angle={-30} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {report.fields.map((field, idx) => (
                <Line
                  key={field}
                  type="monotone"
                  dataKey={field}
                  stroke={COLORS[idx % COLORS.length]}
                  activeDot={{ r: 8 }}
                />
              ))}
            </ReLineChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
};
// --- End New Component ---


export default function CustomReports() {
  const propertyService = new PropertyService();
  const {isCacheValid,getAllProperties}=usePropertyStore()

  const [activeTab, setActiveTab] = useState("create")
  const [reportName, setReportName] = useState("")
  const [reportDescription, setReportDescription] = useState("")
  const [selectedProperties, setSelectedProperties] = useState<string[]>([])
  const [selectedFields, setSelectedFields] = useState<string[]>([])
const [chartType, setChartType] = useState<Report['type']>("bar") 
  const [propertyFilter, setPropertyFilter] = useState("all")
  const [savedReports, setSavedReports] = useState<Report[]>([])
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [currentReportId, setCurrentReportId] = useState<string | null>(null)
  const [shareEmail, setShareEmail] = useState("")
  const [shareMessage, setShareMessage] = useState("")
  const [properties, setProperties] = useState<Property[]>([]);
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#d0ed57", "#a4de6c", "#c2d6ff", "#f5d7d7", "#d7f5d7", "#d7d7f5"];

  useEffect(() => {
    const fetchProperties = async () => {
      if (isCacheValid()) {
        setProperties(getAllProperties());
      } else {
        const res = await propertyService.getProperties();
        setProperties(res);
      }
    };

    fetchProperties();
  }, [isCacheValid, getAllProperties, propertyService]);
  // Refs for chart previews
  const createChartRef = useRef<HTMLDivElement>(null); // For the chart in the "Create" tab
  const hiddenChartRef = useRef<HTMLDivElement>(null); // For the hidden chart to be captured

  // State to hold the report data for the hidden chart to render
  const [reportToCapture, setReportToCapture] = useState<Report | null>(null);


  // Available fields for reports
  const availableFields = [
    { id: "price", label: "Property Value" },
    { id: "area", label: "Square Footage" },
   
    { id: "views", label: "View Count" },
  ]
  const [propertySearchTerm, setPropertySearchTerm] = useState("")
  // Filter properties based on selection and search
  const filteredProperties = properties.filter((property:Property) => {
    // First apply the confidence filter
    let passesConfidenceFilter = true
    if (propertyFilter === "high") passesConfidenceFilter = property.confidence === "High"
    else if (propertyFilter === "medium") passesConfidenceFilter = property.confidence === "Medium"
    else if (propertyFilter === "low") passesConfidenceFilter = property.confidence === "Low"

    // Then apply the search filter if there's a search term
    const passesSearchFilter =
      propertySearchTerm === "" ||
      property.address.toLowerCase().includes(propertySearchTerm.toLowerCase()) ||
      property.city.toLowerCase().includes(propertySearchTerm.toLowerCase()) ||
      property.price.toString().toLowerCase().includes(propertySearchTerm.toLowerCase()) ||
      (property.type as string).toLowerCase().includes(propertySearchTerm.toLowerCase())

    return passesConfidenceFilter && passesSearchFilter
  })

  // Toggle property selection
  const toggleProperty = (propertyId: string) => {
    if (selectedProperties.includes(propertyId)) {
      setSelectedProperties(selectedProperties.filter((id) => id !== propertyId))
    } else {
      setSelectedProperties([...selectedProperties, propertyId])
    }
  }

  // Toggle field selection
  const toggleField = (fieldId: string) => {
    if (selectedFields.includes(fieldId)) {
      setSelectedFields(selectedFields.filter((id) => id !== fieldId))
    } else {
      setSelectedFields([...selectedFields, fieldId])
    }
  }

  // Select all properties
  const selectAllProperties = () => {
    if (selectedProperties.length === filteredProperties.length) {
      setSelectedProperties([])
    } else {
      setSelectedProperties(filteredProperties.map((p) => p.id))
    }
  }

  // Save report
  const saveReport = async () => {
    if (!reportName) {
      toast({
        title: "Report name required",
        description: "Please enter a name for your report.",
        variant: "destructive",
      })
      return
    }

    if (selectedProperties.length === 0) {
      toast({
        title: "No properties selected",
        description: "Please select at least one property for your report.",
        variant: "destructive",
      })
      return
    }

    if (selectedFields.length === 0) {
      toast({
        title: "No fields selected",
        description: "Please select at least one field for your report.",
        variant: "destructive",
      })
      return
    }

    try {
      // Create the report data
      const reportData = {
        title: reportName,
        description: reportDescription,
        reportType: chartType,
        notes: JSON.stringify({
          properties: selectedProperties,
          fields: selectedFields,
          data: properties.filter(p => selectedProperties.includes(p.id))
            .map(p => {
              const data: any = { id: p.id };
              selectedFields.forEach(field => {
                data[field] = p[field as keyof typeof p];
              });
              return data;
            })
        }),
        exported: true
      };

      // Save to database
      const savedReport = await createReport(reportData);

      // Update local state
      setSavedReports([...savedReports, {
        id: savedReport.id,
        name: savedReport.title,
        description: savedReport.description,
        created: format(new Date(savedReport.createdAt), 'MMM dd, yyyy'),
        type: savedReport.reportType as Report['type'],
        properties: selectedProperties,
        fields: selectedFields,
        shared: false,
      }]);

      toast({
        title: "Report saved",
        description: "Your custom report has been saved successfully.",
        variant: "default",
      });

      // Reset form
      setReportName("");
      setReportDescription("");
      setSelectedProperties([]);
      setSelectedFields([]);
      setChartType("bar");

      // Switch to saved reports tab
      setActiveTab("saved");
    } catch (error) {
      console.error('Error saving report:', error);
      toast({
        title: "Error",
        description: "Failed to save report. Please try again.",
        variant: "destructive",
      });
    }
  }

  // Delete report
  const deleteReport = (reportId: string) => {
    setSavedReports(savedReports.filter((report) => report.id !== reportId))

    toast({
      title: "Report deleted",
      description: "The report has been deleted successfully.",
      variant: "default",
    })
  }

  // Open share dialog
  const openShareDialog = (reportId: string) => {
    setCurrentReportId(reportId)
    setShareDialogOpen(true)
  }

  // Share report
  const shareReport = () => {
    if (!shareEmail) {
      toast({
        title: "Email required",
        description: "Please enter an email address to share with.",
        variant: "destructive",
      })
      return
    }

    console.log(`Sharing report ${currentReportId} with ${shareEmail}`)

    setSavedReports(
      savedReports.map((report) => (report.id === currentReportId ? { ...report, shared: true } : report)),
    )

    toast({
      title: "Report shared",
      description: `The report has been shared with ${shareEmail}.`,
      variant: "default",
    })

    setShareEmail("")
    setShareMessage("")
    setShareDialogOpen(false)
    setCurrentReportId(null)
  }

  // Get chart icon based on type
  const getChartIcon = (type: string) => {
    switch (type) {
      case "bar":
        return <BarChart className="h-5 w-5" />
      case "pie":
        return <PieChart className="h-5 w-5" />
      case "line":
        return <LineChart className="h-5 w-5" />
      default:
        return <BarChart className="h-5 w-5" />
    }
  }

  // Function to download the report as PDF
  const downloadReport = useCallback(async (report: Report) => {
    toast({
      title: "Generating PDF...",
      description: "Please wait while your report is being prepared.",
    });

    // Set the state for the hidden chart renderer
    setReportToCapture(report);

    // Wait for the hidden chart to potentially render
    // A longer delay might be needed for very complex charts or slower machines
    await new Promise(resolve => setTimeout(resolve, 700)); // Increased delay slightly

    if (hiddenChartRef.current) {
      try {
        const canvas = await html2canvas(hiddenChartRef.current, {
          scale: 2, // Increase scale for better resolution
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;

        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // For content spanning multiple pages
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`${(report.name as string) .replace(/\s+/g, '_')}_Report.pdf`);

        toast({
          title: "Download complete",
          description: "Your report has been successfully downloaded.",
          variant: "default",
        });
      } catch (error) {
        console.error("Failed to generate PDF:", error);
        toast({
          title: "Download failed",
          description: "There was an error generating your PDF report. Please try again.",
          variant: "destructive",
        });
      } finally {
        setReportToCapture(null); // Clear the hidden chart state
      }
    } else {
      toast({
        title: "Chart not rendered",
        description: "Could not capture the chart for PDF generation. The hidden element was not ready.",
        variant: "destructive",
      });
    }
  }, []);

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create Report</TabsTrigger>
          <TabsTrigger value="saved">Saved Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Details</CardTitle>
              <CardDescription>Enter the basic information for your report</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reportName">Report Name</Label>
                  <Input
                    id="reportName"
                    placeholder="Enter report name"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chartType">Chart Type</Label>
                  <Select value={chartType} onValueChange={(value) => setChartType(value as Report['type'])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select chart type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">Bar Chart</SelectItem>
                      <SelectItem value="pie">Pie Chart</SelectItem>
                      <SelectItem value="line">Line Chart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportDescription">Description</Label>
                <Textarea
                  id="reportDescription"
                  placeholder="Enter report description"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Property Selection */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Select Properties</CardTitle>
                <CardDescription>Choose the properties to include in your report</CardDescription>
              </CardHeader>
              <div className="relative mx-4 mb-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search properties by name, location, or value..."
                    className="pl-9 w-full"
                    value={propertySearchTerm}
                    onChange={(e) => setPropertySearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="selectAll"
                      checked={selectedProperties.length === filteredProperties.length && filteredProperties.length > 0}
                      onCheckedChange={selectAllProperties}
                    />
                    <Label htmlFor="selectAll">Select All</Label>
                  </div>

                  <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by confidence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Properties</SelectItem>
                      <SelectItem value="high">High Confidence</SelectItem>
                      <SelectItem value="medium">Medium Confidence</SelectItem>
                      <SelectItem value="low">Low Confidence</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 max-h-[300px] overflow-y-auto">
                    {filteredProperties.map((property) => (
                      <div key={property.id} className="flex items-start space-x-2">
                        <Checkbox
                          id={property.id}
                          checked={selectedProperties.includes(property.id)}
                          onCheckedChange={() => toggleProperty(property.id)}
                        />
                        <div>
                          <Label htmlFor={property.id} className="font-medium">
                            {capitalizeFirstLetter(property.type as string)} {property.city}
                          </Label>
                          <p className="text-sm text-gray-500">{property.address}</p>
                          <p className="text-sm text-gray-500">Value: {property.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-500">
                  {selectedProperties.length} of {filteredProperties.length} properties selected
                </div>
              </CardContent>
            </Card>

            {/* Data Fields */}
            <Card>
              <CardHeader>
                <CardTitle>Data Fields</CardTitle>
                <CardDescription>Select fields to include in your report</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {availableFields.map((field) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`field-${field.id}`}
                        checked={selectedFields.includes(field.id)}
                        onCheckedChange={() => toggleField(field.id)}
                      />
                      <Label htmlFor={`field-${field.id}`}>{field.label}</Label>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={saveReport}
                  disabled={!reportName || selectedProperties.length === 0 || selectedFields.length === 0}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Report
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Report Preview for Create Tab */}
          {selectedProperties.length > 0 && selectedFields.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Report Preview</CardTitle>
                <CardDescription>Preview of your custom report</CardDescription>
              </CardHeader>
              <CardContent ref={createChartRef} className="flex justify-center p-4">
                <ReportChartRenderer
                  report={{
                    id: 'current-preview', // Dummy ID for current preview
                    name: reportName,
                    description: reportDescription,
                    created: '',
                    type: chartType,
                    properties: selectedProperties,
                    fields: selectedFields,
                    shared: false,
                  }}
                  availableFields={availableFields}
                  trendingProperties={properties}
                  COLORS={COLORS}
                  isDownloadPreview={false} // This is the visible preview, not for download
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Report Preview</CardTitle>
                <CardDescription>Preview of your custom report</CardDescription>
              </CardHeader>
              <CardContent className="text-center p-8 text-gray-500">
                Select properties and fields to see a chart preview.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedReports.map((report) => (
              <Card key={report.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      {getChartIcon(report.type)}
                      <CardTitle className="ml-2">{report.name}</CardTitle>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => deleteReport(report.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Created:</span>
                      <span>{report.created}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Properties:</span>
                      <span>{report.properties.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fields:</span>
                      <span>{report.fields.map(fieldId => availableFields.find(f => f.id === fieldId)?.label || fieldId).join(', ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Shared:</span>
                      <span>{report.shared ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-0">
                  <Button variant="outline" size="sm" onClick={() => downloadReport(report)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openShareDialog(report.id)}>
                    <Share className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                </CardFooter>
              </Card>
            ))}

            {/* Add New Report Card */}
            <Card
              className="flex flex-col items-center justify-center h-[300px] border-dashed cursor-pointer hover:bg-gray-50"
              onClick={() => setActiveTab("create")}
            >
              <Plus className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 font-medium">Create New Report</p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Hidden div for chart rendering specifically for html2canvas capture */}
      <div
        ref={hiddenChartRef}
        // Key styles for off-screen rendering
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '0',
          width: '800px', // Crucial: Fixed width for consistent capture
          height: '600px', // Crucial: Fixed height for consistent capture, adjust as needed
          overflow: 'hidden', // Hide scrollbars
          backgroundColor: 'white', // Ensure white background for screenshot
          padding: '30px', // Add padding for screenshot, adjust as needed
          zIndex: -1, // Ensure it doesn't interfere with other elements
        }}
      >
        {reportToCapture && (
          <ReportChartRenderer
            report={reportToCapture}
            availableFields={availableFields}
            trendingProperties={properties}
            COLORS={COLORS}
            isDownloadPreview={true} // Indicate that this render is for download
          />
        )}
      </div>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Report</DialogTitle>
            <DialogDescription>Share this report with team members or stakeholders.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                placeholder="Enter email address"
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a message"
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={shareReport}>Share Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
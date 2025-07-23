// API functions for reports
export async function getExportHistory() {
  const response = await fetch('/api/reports', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // This is important for auth
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch export history');
  }
  
  const reports = await response.json();
  return reports.map((report: any) => ({
    ...report,
    notes: report.notes ? JSON.parse(report.notes) : { properties: [], fields: [] }
  }));
}

export async function createReport(data: {
  title: string;
  description?: string;
  notes?: string;
  reportType: string;
  exported?: boolean;
}) {
  const response = await fetch('/api/reports', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // This is important for auth
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create report');
  }
  
  return response.json();
}

export async function deleteReport(id: string) {
  const response = await fetch(`/api/reports?id=${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // This is important for auth
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete report');
  }
  
  return response.json();
} 
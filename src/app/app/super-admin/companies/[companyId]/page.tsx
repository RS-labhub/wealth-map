// @ts-nocheck
import { PrismaClient } from "@/generated/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Users, Settings, Activity } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CompanyActions from "../company-actions";
import CompanyIdCopy from "./company-id-copy";
import { redirect } from 'next/navigation';

const prisma = new PrismaClient();

export default async function CompanyDetailsPage({ params }: { params: { companyId: string } }) {
  redirect(`/app/super-admin/companies/${params.companyId}/overview`);

  const company = await prisma.organization.findUnique({
    where: { id: params.companyId },
    include: {
      members: {
        include: { user: true },
      },
    },
  });

  if (!company) {
    return <div className="p-8">Company not found.</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{company.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={company.status === "active" ? "default" : "destructive"}>
              {company.status}
            </Badge>
            <CompanyIdCopy companyId={company.id} />
          </div>
        </div>
        <CompanyActions company={company} />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{company.members.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{company.status}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {company.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{member.user.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {member.user.email}
                      </div>
                    </div>
                    <Badge>{member.role}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Company ID</h3>
                  <p className="text-sm text-muted-foreground">{company.id}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Created At</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
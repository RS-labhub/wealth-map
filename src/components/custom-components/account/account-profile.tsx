"use client"

import { Download, FileText, Mail, MapPin, Phone, User, Building, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

interface UserStats {
  totalReports: number
  propertiesAnalyzed: number
  savedProperties: number
  recentActivity: Array<{
    action: string
    date: string
    time: string
  }>
}

interface ExtendedUser {
  id: string
  name?: string | null
  email?: string | null
  role?: "SUPER_ADMIN" | "COMPANY_ADMIN" | "EMPLOYEE"
  company?: string
  location?: string
  phone?: string
  createdAt?: string
  lastLogin?: string
  status?: string
}

export function AccountProfile() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<UserStats>({
    totalReports: 0,
    propertiesAnalyzed: 0,
    savedProperties: 0,
    recentActivity: []
  })

  useEffect(() => {
    // Fetch user stats based on role
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/user/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Error fetching user stats:', error)
      }
    }

    fetchStats()
  }, [])

  if (!session?.user) return null

  const user = session.user as ExtendedUser

  const userData = {
    name: user.name || '',
    email: user.email || '',
    role: user.role || '',
    company: user.company || '',
    location: user.location || '',
    phone: user.phone || '',
    memberSince: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'N/A',
    lastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }) : 'N/A',
    accountStatus: user.status || 'Active',
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'COMPANY_ADMIN':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-green-100 text-green-800 border-green-200'
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Profile Information</h2>
          <p className="text-sm text-muted-foreground mt-1">View your account information and profile details</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 self-start">
          <Download className="h-4 w-4" />
          Download Account Info
        </Button>
      </div>

      <Card>
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6">
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white border-4 border-white shadow-sm flex items-center justify-center text-2xl font-semibold text-gray-700">
                {userData.name.charAt(0)}
              </div>
            </div>

            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                <h3 className="text-2xl font-bold text-gray-800">
                  {userData.name}
                </h3>
                <Badge className={getRoleBadgeColor(userData.role)}>
                  {userData.role.replace('_', ' ')}
                </Badge>
              </div>

              {userData.company && (
                <p className="text-gray-600 mt-1">{userData.company}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{userData.email}</span>
                </div>
                {userData.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{userData.phone}</span>
                  </div>
                )}
                {userData.location && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{userData.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Member Since</p>
              <p className="font-medium">{userData.memberSince}</p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Account Status</p>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {userData.accountStatus}
              </Badge>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Last Login</p>
              <p className="font-medium">{userData.lastLogin}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-50 p-2 rounded-full">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium">Reports & Analytics</h3>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Reports Generated</span>
              <span className="font-semibold text-lg">{stats.totalReports}</span>
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Properties Analyzed</span>
              <span className="font-semibold text-lg">{stats.propertiesAnalyzed}</span>
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Saved Properties</span>
              <span className="font-semibold text-lg">{stats.savedProperties}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-amber-50 p-2 rounded-full">
              <User className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-medium">Recent Activity</h3>
          </div>

          <div className="space-y-4">
            {stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.date}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{activity.time}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

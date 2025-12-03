// app/rescue/reports/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@components/dashboard/dashboard-layout";
import { useAuth } from "@/shared/hooks/useAuth";
import { useNotifications } from "@/shared/hooks/useNotifications";
import { useRescueCases } from "../cases/hooks/useRescueCases";
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Tooltip,
} from "recharts";
import {
  RefreshCw,
  Ambulance,
  AlertCircle,
  Printer,
  Download,
  FileText,
  Clock,
  CheckCircle,
  Activity,
  MapPin,
} from "lucide-react";
import { Badge } from "@components/ui/badge";
import { CSVLink } from "react-csv";

const RescueReportsPageContent = () => {
  useAuth();
  const { notifications } = useNotifications();
  const { cases, loading, error } = useRescueCases();

  const refetch = () => {
    window.location.reload();
  };
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [timePeriod, setTimePeriod] = useState("month");
  const [currentDate, setCurrentDate] = useState<string>("");

  // Set current date on client side only to avoid hydration mismatch
  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, []);

  // Helper function to get location string
  const getLocationString = (location: any): string => {
    if (!location) return "-";
    if (typeof location === "string") return location;
    if (location.address) return location.address;
    return "-";
  };

  // Filter cases
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const query = searchQuery.toLowerCase();
      const locationStr = getLocationString(c.location);

      const matchesQuery =
        c.patientName?.toLowerCase().includes(query) ||
        locationStr.toLowerCase().includes(query) ||
        c.emergencyType?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" ? true : c.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [cases, searchQuery, statusFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalMissions = cases.length;
    const completedMissions = cases.filter(
      (c) => c.status === "completed"
    ).length;
    const inProgressMissions = cases.filter(
      (c) => c.status === "in-progress"
    ).length;
    const criticalMissions = cases.filter((c) => c.severity >= 3).length;

    // Calculate success rate
    const successRate =
      totalMissions > 0
        ? ((completedMissions / totalMissions) * 100).toFixed(1)
        : "0";

    // Mock average response time (in minutes)
    const avgResponseTime =
      totalMissions > 0
        ? Math.round(Math.random() * 10 + 5) // Random between 5-15 minutes
        : 0;

    return {
      totalMissions,
      completedMissions,
      inProgressMissions,
      criticalMissions,
      successRate,
      avgResponseTime,
    };
  }, [cases]);

  // Chart data
  const statusChartData = [
    { name: "เสร็จสิ้น", value: stats.completedMissions, color: "#10b981" },
    {
      name: "กำลังดำเนินการ",
      value: stats.inProgressMissions,
      color: "#3b82f6",
    },
    {
      name: "รอดำเนินการ",
      value:
        stats.totalMissions -
        stats.completedMissions -
        stats.inProgressMissions,
      color: "#f59e0b",
    },
  ];

  const severityChartData = [
    {
      name: "วิกฤต",
      value: cases.filter((c) => c.severity === 4).length,
      color: "#ef4444",
    },
    {
      name: "เร่งด่วน",
      value: cases.filter((c) => c.severity === 3).length,
      color: "#f97316",
    },
    {
      name: "ปานกลาง",
      value: cases.filter((c) => c.severity === 2).length,
      color: "#eab308",
    },
    {
      name: "ปกติ",
      value: cases.filter((c) => c.severity === 1).length,
      color: "#22c55e",
    },
  ];

  const trendData = [
    { day: "จ", missions: 12, completed: 10 },
    { day: "อ", missions: 15, completed: 13 },
    { day: "พ", missions: 8, completed: 7 },
    { day: "พฤ", missions: 18, completed: 16 },
    { day: "ศ", missions: 14, completed: 12 },
    { day: "ส", missions: 10, completed: 9 },
    { day: "อา", missions: 13, completed: 11 },
  ];

  const handlePrint = () => {
    window.print();
  };

  // CSV Data
  const csvHeaders = [
    { label: "ชื่อผู้ป่วย", key: "patientName" },
    { label: "ประเภท", key: "emergencyType" },
    { label: "ระดับความรุนแรง", key: "severity" },
    { label: "สถานะ", key: "status" },
    { label: "สถานที่", key: "location" },
    { label: "วันที่-เวลา", key: "reportedAt" },
  ];

  const csvData = filteredCases.map((c) => ({
    patientName: c.patientName || "-",
    emergencyType: c.emergencyType || "-",
    severity: c.severity,
    status: c.status,
    location: getLocationString(c.location),
    reportedAt: new Date(c.reportedAt).toLocaleString("th-TH"),
  }));

  const csvFilename = `rescue-missions-report-${
    new Date().toISOString().split("T")[0]
  }.csv`;

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">
            กำลังโหลดข้อมูล...
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-emerald-700 to-teal-800 p-8 shadow-xl">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Ambulance className="h-10 w-10" />
              รายงานภารกิจกู้ภัย
            </h1>
            <p className="text-green-100 text-sm">
              ข้อมูล ณ วันที่ {currentDate || "กำลังโหลด..."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={refetch}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> รีเฟรช
            </Button>

            <CSVLink
              data={csvData}
              headers={csvHeaders}
              filename={csvFilename}
              className="inline-flex"
            >
              <Button
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <Download className="h-4 w-4 mr-2" /> CSV
              </Button>
            </CSVLink>

            <Button
              onClick={handlePrint}
              className="bg-white text-green-700 hover:bg-green-50"
            >
              <Printer className="h-4 w-4 mr-2" /> พิมพ์ / PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  ภารกิจทั้งหมด
                </p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {stats.totalMissions}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  ภารกิจที่ได้รับมอบหมาย
                </p>
              </div>
              <Ambulance className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">เสร็จสิ้น</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {stats.completedMissions}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  อัตราสำเร็จ: {stats.successRate}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  กำลังดำเนินการ
                </p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {stats.inProgressMissions}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  ภารกิจที่กำลังปฏิบัติ
                </p>
              </div>
              <Activity className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  เวลาตอบสนองเฉลี่ย
                </p>
                <p className="text-3xl font-bold text-purple-600 mt-2">
                  {stats.avgResponseTime}
                </p>
                <p className="text-xs text-slate-400 mt-1">นาที</p>
              </div>
              <Clock className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-md border-0 bg-slate-50 dark:bg-slate-800">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="ค้นหาชื่อผู้ป่วย, สถานที่, ประเภท..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white"
            />
          </div>
          <Select onValueChange={setStatusFilter} value={statusFilter}>
            <SelectTrigger className="w-full sm:w-56 bg-white">
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">ทั้งหมด</SelectItem>
              <SelectItem value="pending">รอดำเนินการ</SelectItem>
              <SelectItem value="assigned">มอบหมายแล้ว</SelectItem>
              <SelectItem value="in-progress">กำลังดำเนินการ</SelectItem>
              <SelectItem value="completed">เสร็จสิ้น</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={setTimePeriod} value={timePeriod}>
            <SelectTrigger className="w-full sm:w-56 bg-white">
              <SelectValue placeholder="ช่วงเวลา" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">7 วันที่ผ่านมา</SelectItem>
              <SelectItem value="month">30 วันที่ผ่านมา</SelectItem>
              <SelectItem value="quarter">3 เดือนที่ผ่านมา</SelectItem>
              <SelectItem value="year">1 ปีที่ผ่านมา</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">สถานะภารกิจ</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statusChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">ระดับความรุนแรง</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={severityChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">แนวโน้มรายสัปดาห์</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="missions"
                  stroke="#3b82f6"
                  name="ภารกิจทั้งหมด"
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#10b981"
                  name="เสร็จสิ้น"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="shadow-md border-0">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>ประวัติภารกิจ</span>
            <Badge variant="outline">{filteredCases.length} ภารกิจ</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredCases.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Ambulance className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium">ยังไม่มีรายงานภารกิจ</p>
              <p className="text-sm mt-2">
                รายงานจะปรากฏที่นี่เมื่อภารกิจเสร็จสิ้น
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-600 font-medium">
                  <tr>
                    <th className="px-4 py-3">ชื่อผู้ป่วย</th>
                    <th className="px-4 py-3">ประเภท</th>
                    <th className="px-4 py-3">ระดับความรุนแรง</th>
                    <th className="px-4 py-3">สถานะ</th>
                    <th className="px-4 py-3">สถานที่</th>
                    <th className="px-4 py-3">วันที่-เวลา</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCases.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">
                        {c.patientName || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {c.emergencyType || "-"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            c.severity === 4
                              ? "bg-red-100 text-red-700"
                              : c.severity === 3
                              ? "bg-orange-100 text-orange-700"
                              : c.severity === 2
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          ระดับ {c.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            c.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : c.status === "assigned"
                              ? "bg-blue-100 text-blue-700"
                              : c.status === "in-progress"
                              ? "bg-indigo-100 text-indigo-700"
                              : c.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {c.status === "pending"
                            ? "รอดำเนินการ"
                            : c.status === "assigned"
                            ? "มอบหมายแล้ว"
                            : c.status === "in-progress"
                            ? "กำลังดำเนินการ"
                            : c.status === "completed"
                            ? "เสร็จสิ้น"
                            : c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-slate-600">
                          <MapPin className="h-3 w-3" />
                          <span className="max-w-[200px] truncate">
                            {getLocationString(c.location)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {new Date(c.reportedAt).toLocaleString("th-TH")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const RescueReportsPage = () => {
  const { notifications, unreadCount, onMarkAsRead, onMarkAllAsRead } =
    useNotifications();

  return (
    <DashboardLayout
      role="rescue"
      notifications={notifications}
      unreadCount={unreadCount}
      onMarkAsRead={onMarkAsRead}
      onMarkAllAsRead={onMarkAllAsRead}
    >
      <RescueReportsPageContent />
    </DashboardLayout>
  );
};

export default RescueReportsPage;

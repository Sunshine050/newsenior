// app/1669/cases/components/CaseCard.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select";
import { User, Phone, Map, Clock } from "lucide-react";
import { cn } from "@lib/utils";
import { useToast } from "@/shared/hooks/use-toast";
import { Hospital } from "../../../shared/types";
import { statusColors, severityColors } from "../../../shared/utils/statusUtils";
import { EmergencyCase } from "../../../shared/types";

interface CaseCardProps extends EmergencyCase {
  hospitals: Hospital[];
  onAssign: (caseId: string, hospitalId: string) => Promise<void>;
  role: string;
}

export const CaseCard: React.FC<CaseCardProps> = ({
  id,
  description,
  descriptionFull,
  status,
  severity,
  grade,
  reportedAt,
  patientName,
  contactNumber,
  emergencyType,
  location,
  assignedTo,
  symptoms,
  hospitals,
  onAssign,
  role,
}) => {
  const { toast } = useToast();
  const [selectedHospital, setSelectedHospital] = useState<string>("");

  const handleAssign = async () => {
    if (!selectedHospital) {
      toast({ title: "ข้อผิดพลาด", description: "กรุณาเลือกโรงพยาบาล", variant: "destructive" });
      return;
    }
    // เช็ค status ก่อนมอบหมาย
    if (status !== "pending") {
      toast({ 
        title: "ไม่สามารถมอบหมายได้", 
        description: `เคสนี้อยู่ในสถานะ "${status === "assigned" ? "มอบหมายแล้ว" : status === "in-progress" ? "กำลังดำเนินการ" : status === "completed" ? "เสร็จสิ้น" : status === "cancelled" ? "ยกเลิก" : status}" ไม่สามารถมอบหมายได้`, 
        variant: "destructive" 
      });
      return;
    }
    try {
      // เรียก onAssign และรอให้เสร็จก่อนแสดง toast
      await onAssign(id, selectedHospital);
      // ไม่ต้องแสดง toast ที่นี่ เพราะ onAssign จะจัดการเอง
      setSelectedHospital("");
    } catch (error: any) {
      console.error("เกิดข้อผิดพลาดขณะมอบหมายเคส:", error);
      // แปลง error message ให้เข้าใจง่ายขึ้น
      let errorMessage = error.message || "ไม่สามารถมอบหมายเคสได้";
      if (errorMessage.includes("Only PENDING cases can be assigned") || errorMessage.includes("ไม่ได้อยู่ในสถานะ")) {
        errorMessage = "เคสนี้ไม่ได้อยู่ในสถานะ 'รอการดำเนินการ' ไม่สามารถมอบหมายได้ กรุณารีเฟรชหน้าเว็บ";
      }
      toast({ title: "ข้อผิดพลาด", description: errorMessage, variant: "destructive" });
    }
  };

  return (
    <Card className="bg-white dark:bg-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200">เคส #{id.slice(-8)}</CardTitle>
          <Badge className={cn("text-sm font-medium", statusColors[status])}>
            {status === "pending" ? "รอการดำเนินการ" : status === "assigned" ? "มอบหมายแล้ว" : status === "in-progress" ? "กำลังดำเนินการ" : status === "completed" ? "เสร็จสิ้น" : "ยกเลิก"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-medium">ผู้ป่วย:</span> {patientName}</p>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-500" />
              <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-medium">ติดต่อ:</span> {contactNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <Map className="h-4 w-4 text-slate-500" />
              <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-medium">สถานที่:</span> {location.address}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-medium">เวลา:</span> {new Date(reportedAt).toLocaleString("th-TH")}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-medium">ประเภท:</span> {emergencyType}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">ระดับความรุนแรง:</span>
              <Badge className={cn("ml-2", severityColors[severity])}>
                ระดับ {severity} ({grade === "CRITICAL" ? "วิกฤต" : grade === "URGENT" ? "เร่งด่วน" : "ไม่เร่งด่วน"})
              </Badge>
            </div>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">รายละเอียด:</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-3">{descriptionFull}</p>
        </div>
        {symptoms.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">อาการ:</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {symptoms.map((symptom, index) => (
                <Badge key={index} variant="outline" className="text-xs">{symptom}</Badge>
              ))}
            </div>
          </div>
        )}
        {assignedTo && (
          <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-medium">มอบหมายให้:</span> {assignedTo}</p>
        )}
        {!assignedTo && status === "pending" && status !== "completed" && status !== "cancelled" && (
          <div className="flex gap-2 items-center">
            <Select value={selectedHospital} onValueChange={setSelectedHospital}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="เลือกโรงพยาบาล" />
              </SelectTrigger>
              <SelectContent>
                {hospitals.map((hospital) => (
                  <SelectItem key={hospital.id} value={hospital.id}>{hospital.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAssign} disabled={!selectedHospital}>มอบหมาย</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};






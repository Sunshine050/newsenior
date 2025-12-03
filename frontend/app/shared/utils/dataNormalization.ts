// app/shared/utils/dataNormalization.ts
import { EmergencyCase } from "../../shared/types";

const typeTranslations: Record<string, string> = {
  ACCIDENT: "อุบัติเหตุ",
  MEDICAL: "การแพทย์",
  FIRE: "ไฟไหม้",
  CRIME: "อาชญากรรม",
  OTHER: "อื่นๆ",
};

const gradeToSeverity: Record<string, number> = {
  CRITICAL: 4,
  URGENT: 3,
  NON_URGENT: 1,
};

export const normalizeCaseData = (item: any): EmergencyCase => {
  const symptomsData = item.medicalInfo?.symptoms;
  const symptoms = Array.isArray(symptomsData) ? symptomsData : symptomsData ? [symptomsData.toString()] : [];
  
  // Map backend status (uppercase with underscore) to frontend status (lowercase with dash)
  const statusMap: Record<string, string> = {
    "PENDING": "pending",
    "ASSIGNED": "assigned",
    "IN_PROGRESS": "in-progress",
    "COMPLETED": "completed",
    "CANCELLED": "cancelled",
    // Handle invalid status values
    "Active": "pending",
    "ACTIVE": "pending",
    "active": "pending",
    // Also support lowercase versions
    "pending": "pending",
    "assigned": "assigned",
    "in-progress": "in-progress",
    "in_progress": "in-progress",
    "completed": "completed",
    "cancelled": "cancelled",
  };
  
  const rawStatus = item.status || "PENDING";
  let normalizedStatus = statusMap[rawStatus] || statusMap[rawStatus.toUpperCase()] || "pending";
  
  // ถ้ามี response (assignedTo) แต่ status ยังเป็น pending ให้เปลี่ยนเป็น assigned
  if (normalizedStatus === "pending" && (item.assignedTo || item.responses?.[0]?.organization?.name)) {
    normalizedStatus = "assigned";
  }
  let severity = Number(item.medicalInfo?.severity) || gradeToSeverity[item.grade] || 1;
  let grade = (item.medicalInfo?.grade || item.grade || "NON_URGENT").toUpperCase();
  if (grade === "UNKNOWN" || !grade || grade === "") {
    grade = "NON_URGENT";
    severity = 1;
    console.log(`ปรับ grade เป็น NON_URGENT และ severity เป็น 1 สำหรับเคส ${item.id}`);
  }
  const validSeverity = severity >= 1 && severity <= 4 ? severity : 1;
  const validGrade = ["CRITICAL", "URGENT", "NON_URGENT"].includes(grade) ? grade : "NON_URGENT";

  // Handle location: check if it's already an object or a string
  let location;
  if (item.location && typeof item.location === 'object' && item.location.address) {
    // Backend already returned location as an object
    location = {
      address: item.location.address || "ไม่ทราบสถานที่",
      coordinates: item.location.coordinates || { lat: item.latitude || 0, lng: item.longitude || 0 },
    };
  } else {
    // Backend returned location as a string or it's missing
    location = {
      address: typeof item.location === 'string' ? item.location : (item.location?.address || "ไม่ทราบสถานที่"),
      coordinates: { lat: item.latitude || item.location?.coordinates?.lat || 0, lng: item.longitude || item.location?.coordinates?.lng || 0 },
    };
  }

  // ตรวจสอบว่ามี response หรือไม่ เพื่อกำหนด assignedTo และ status
  const assignedTo = item.assignedTo || item.responses?.[0]?.organization?.name || undefined;
  
  // ถ้ามี assignedTo แต่ status ยังเป็น pending ให้เปลี่ยนเป็น assigned
  const finalStatus = (normalizedStatus === "pending" && assignedTo) 
    ? "assigned" 
    : normalizedStatus;
  
  return {
    id: item.id || "unknown-id",
    description: (item.description || "ไม่มีรายละเอียด").slice(0, 50) + "...",
    descriptionFull: item.description || "ไม่มีรายละเอียด",
    status: finalStatus as EmergencyCase["status"],
    severity: validSeverity as 1 | 2 | 3 | 4,
    grade: validGrade as "CRITICAL" | "URGENT" | "NON_URGENT",
    reportedAt: item.reportedAt || item.createdAt || new Date().toISOString(),
    patientName: item.patientName || `${item.patient?.firstName || ""} ${item.patient?.lastName || ""}`.trim() || "ไม่ทราบชื่อ",
    contactNumber: item.contactNumber || item.patient?.phone || "N/A",
    emergencyType: item.emergencyType || typeTranslations[item.type] || typeTranslations["OTHER"],
    location,
    assignedTo: assignedTo,
    symptoms,
  };
};
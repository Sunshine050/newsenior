// app/shared/services/emergencyService.ts
// Service layer for emergency (SOS) related API calls.

import { getAuthHeaders } from "@lib/utils";
import { normalizeCaseData } from "../utils/dataNormalization";
import { EmergencyCase } from "../types";
import { Report, EmergencyRequestFromApi } from "@/shared/types"; // เพิ่ม type EmergencyRequestFromApi

// ---------------------------------------------------------------------------
// DTO definitions (match backend expectations)
// ---------------------------------------------------------------------------
interface CreateEmergencyRequestDto {
  type: string; // e.g. 'accident', 'medical'
  location?: { latitude: number; longitude: number };
  medicalInfo?: { severity: number; details: string };
  // additional fields can be added as needed
}

interface UpdateEmergencyStatusDto {
  status: string; // e.g. 'IN_PROGRESS', 'CANCELLED', 'COMPLETED'
  notes?: string;
}

// ---------------------------------------------------------------------------
// Core service functions
// ---------------------------------------------------------------------------

/** Fetch active emergencies for the dashboard (returns normalized EmergencyCase[]) */
export const fetchActiveEmergencies = async (): Promise<EmergencyCase[]> => {
  const headers = getAuthHeaders();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sos/dashboard/active-emergencies`, {
    headers,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch active emergencies: ${response.statusText}`);
  }
  const data: EmergencyRequestFromApi[] = await response.json();
  return data.map(normalizeCaseData);
};

/** Fetch assigned cases for the authenticated rescue team (returns raw API data) */
export const fetchRescueAssignedCases = async (): Promise<EmergencyRequestFromApi[]> => {
  const headers = getAuthHeaders();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sos/rescue/assigned-cases`, {
    headers,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch assigned cases: ${response.statusText}`);
  }
  const data: EmergencyRequestFromApi[] = await response.json();
  return data;
};

/** Fetch list of hospitals (used by 1669 dashboard) */
export const fetchHospitals = async (): Promise<Array<{ id: string; name: string }>> => {
  const headers = getAuthHeaders();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/hospitals`, {
    headers,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch hospitals: ${response.statusText}`);
  }
  const data = await response.json();
  return data.map((h: any) => ({ id: h.id, name: h.name || "Unnamed Hospital" }));
};

/** Assign a case to a hospital (used by 1669 dashboard) */
export const assignCase = async (caseId: string, hospitalId: string): Promise<any> => {
  const headers = getAuthHeaders();
  console.log("Assigning case:", caseId, "to hospital:", hospitalId);
  
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sos/${caseId}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ hospitalId }),
  });
  
  if (!response.ok) {
    let errorMessage = `ไม่สามารถมอบหมายเคสได้`;
    try {
      const errorData = await response.json();
      console.error("Assignment error response:", errorData);
      // แปลง error message ให้เข้าใจง่ายขึ้น
      if (errorData.message) {
        if (errorData.message.includes("Only PENDING") || errorData.message.includes("Only PENDING or ASSIGNED")) {
          errorMessage = "เคสนี้ไม่ได้อยู่ในสถานะ 'รอการดำเนินการ' หรือ 'มอบหมายแล้ว' ไม่สามารถมอบหมายได้ กรุณารีเฟรชหน้าเว็บ";
        } else if (errorData.message.includes("already been assigned")) {
          errorMessage = "เคสนี้ถูกมอบหมายให้โรงพยาบาลนี้แล้ว";
        } else if (errorData.message.includes("No available beds")) {
          errorMessage = "โรงพยาบาลที่เลือกไม่มีเตียงว่าง";
        } else {
          errorMessage = errorData.message;
        }
      }
    } catch (parseError) {
      // ถ้า parse JSON ไม่ได้ ให้ใช้ข้อความ default
      const errText = await response.text();
      console.error("Failed to parse error response:", errText);
      if (errText) {
        errorMessage = errText;
      }
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

/** Fetch reports (currently same endpoint as active emergencies) */
export const fetchReports = async (): Promise<Report[]> => {
  const headers = getAuthHeaders();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sos/dashboard/active-emergencies`, {
    headers,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch reports: ${response.statusText}`);
  }
  const data = await response.json();
  return data.map((emergency: any) => ({
    id: emergency.id,
    title: emergency.title || `Emergency Case ${emergency.id}`,
    type: emergency.emergencyType || emergency.type || "emergency",
    date: emergency.reportedAt || emergency.createdAt,
    stats: {
      severity: Number(emergency.medicalInfo?.severity) || 0,
      patientName: `${emergency.patient?.firstName || ""} ${emergency.patient?.lastName || ""}`.trim() || "Unknown",
      status: (emergency.status || "pending").toLowerCase(),
    },
    details: emergency,
  }));
};

/** Create a new emergency request */
export const createEmergencyRequest = async (data: CreateEmergencyRequestDto): Promise<any> => {
  const headers = getAuthHeaders();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to create emergency: ${response.statusText}`);
  }
  return response.json();
};

/** Update the status of an emergency */
export const updateEmergencyStatus = async (id: string, data: UpdateEmergencyStatusDto): Promise<any> => {
  const headers = getAuthHeaders();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sos/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to update status: ${response.statusText}`);
  }
  return response.json();
};

/** Get emergencies created by the authenticated user */
export const getEmergencyRequests = async (): Promise<EmergencyCase[]> => {
  const headers = getAuthHeaders();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sos`, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch emergencies: ${response.statusText}`);
  }
  const data: EmergencyRequestFromApi[] = await response.json();
  return data.map(normalizeCaseData);
};

/** Get all emergencies (staff only) */
export const getAllEmergencyRequests = async (): Promise<EmergencyCase[]> => {
  const headers = getAuthHeaders();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sos/all`, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch all emergencies: ${response.statusText}`);
  }
  const data: EmergencyRequestFromApi[] = await response.json();
  return data.map(normalizeCaseData);
};

/** Get a single emergency by ID */
export const getEmergencyRequestById = async (id: string): Promise<EmergencyCase> => {
  const headers = getAuthHeaders();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sos/${id}`, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch emergency by id: ${response.statusText}`);
  }
  const data: EmergencyRequestFromApi = await response.json();
  return normalizeCaseData(data);
};

/** Transfer a case to a rescue team (Hospital assigns case to rescue team) */
export const transferCase = async (caseId: string, teamId: string, teamName: string): Promise<void> => {
  const headers = getAuthHeaders();
  // ใช้ endpoint assign-case เพื่อสร้าง emergencyResponse สำหรับ rescue team
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/assign-case`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      caseId: caseId,
      assignedToId: teamId,
    }),
  });
  if (!response.ok) {
    let errorMessage = `ไม่สามารถมอบหมายเคสให้ทีมกู้ภัยได้`;
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      const errText = await response.text();
      if (errText) {
        errorMessage = errText;
      }
    }
    throw new Error(errorMessage);
  }
  
  // อัปเดต status เป็น IN_PROGRESS หลังจาก assign สำเร็จ
  const statusRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sos/${caseId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      status: "IN_PROGRESS",
      notes: `Transferred to rescue team: ${teamName}`,
    }),
  });
  if (!statusRes.ok) {
    // ถ้า update status ล้มเหลว แต่ assign สำเร็จแล้ว ก็ไม่ต้อง throw error
    console.warn("Failed to update case status to IN_PROGRESS, but case was assigned successfully");
  }
};

/** Cancel a case (hospital view) */
export const cancelCase = async (caseId: string): Promise<void> => {
  const headers = getAuthHeaders();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sos/${caseId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      status: "CANCELLED",
      notes: "Case cancelled by hospital",
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to cancel case: ${response.statusText} - ${err}`);
  }
};

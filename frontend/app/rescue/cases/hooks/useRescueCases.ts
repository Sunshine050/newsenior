import { useState, useEffect } from 'react';
import { useToast } from '@/shared/hooks/use-toast';
import { 
  fetchRescueAssignedCases, 
  updateEmergencyStatus, 
  cancelCase 
} from '@/shared/services/emergencyService';
import { webSocketClient } from '@lib/websocket';

import { EmergencyRequestFromApi } from '@/shared/types';

// -------------------------------
// Local Type (for frontend UI)
// -------------------------------
export type EmergencyCase = {
  id: string;
  title: string;
  status: 'pending' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
  severity: 1 | 2 | 3 | 4;
  reportedAt: string;
  patientName: string;
  contactNumber: string;
  emergencyType: string;
  location: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  assignedTo: string;
  description: string;
  symptoms: string[];
};

// -------------------------------
// Convert API → UI format
// -------------------------------
const convertApiCase = (apiCase: EmergencyRequestFromApi): EmergencyCase => {
  // Map backend status to frontend status
  const statusMap: Record<string, EmergencyCase["status"]> = {
    "PENDING": "pending",
    "ASSIGNED": "assigned",
    "IN_PROGRESS": "in-progress",
    "COMPLETED": "completed",
    "CANCELLED": "cancelled",
    "pending": "pending",
    "assigned": "assigned",
    "in-progress": "in-progress",
    "in_progress": "in-progress",
    "completed": "completed",
    "cancelled": "cancelled",
  };
  
  const rawStatus = apiCase.status || "PENDING";
  const normalizedStatus = statusMap[rawStatus] || statusMap[rawStatus.toUpperCase()] || "pending";
  
  // Get severity from medicalInfo
  const gradeToSeverity: Record<string, number> = {
    CRITICAL: 4,
    URGENT: 3,
    NON_URGENT: 1,
  };
  const severity = Number(apiCase.medicalInfo?.severity) || gradeToSeverity[apiCase.medicalInfo?.grade] || 1;
  
  return {
    id: apiCase.id,
    title: `${apiCase.emergencyType || "Emergency"} - ${apiCase.patient?.firstName || ""}`,
    status: normalizedStatus,
    severity: (severity >= 1 && severity <= 4 ? severity : 1) as 1 | 2 | 3 | 4,
    reportedAt: apiCase.reportedAt || apiCase.createdAt,
    patientName: `${apiCase.patient?.firstName || ""} ${apiCase.patient?.lastName || ""}`.trim() || "ไม่ทราบชื่อ",
    contactNumber: apiCase.patient?.phone || "-",
    emergencyType: apiCase.emergencyType || "Unknown",
    location: {
      address: typeof apiCase.location === 'string' ? apiCase.location : (apiCase.location?.address || "Unknown"),
      coordinates: {
        lat: apiCase.latitude || apiCase.location?.coordinates?.lat || 0,
        lng: apiCase.longitude || apiCase.location?.coordinates?.lng || 0,
      },
    },
    assignedTo: apiCase.responses?.[0]?.organization?.name || "Unassigned",
    description: apiCase.description || "",
    symptoms: Array.isArray(apiCase.medicalInfo?.symptoms)
      ? apiCase.medicalInfo.symptoms
      : apiCase.medicalInfo?.symptoms
      ? [apiCase.medicalInfo.symptoms]
      : [],
  };
};

// -------------------------------
// Hook
// -------------------------------
export const useRescueCases = () => {
  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load from API (REAL)
  useEffect(() => {
    const loadCases = async () => {
      try {
        setLoading(true);

        const apiCases: EmergencyRequestFromApi[] = await fetchRescueAssignedCases();
        const rescueCases = apiCases.map(convertApiCase);

        setCases(rescueCases);
        setError(null);

      } catch (err: any) {
        console.error("Failed to load rescue cases:", err);

        const message =
          err?.response?.data?.message ||
          err.message ||
          "Failed to load assigned cases";

        if (message.includes("organizationId")) {
          setError("User ยังไม่ได้ถูกผูกกับทีมกู้ภัย");
        } else {
          setError(message);
        }

        toast({
          title: "โหลดข้อมูลล้มเหลว",
          description: "ไม่สามารถดึงข้อมูลเคสได้ กรุณาติดต่อ Admin",
          variant: "destructive",
        });

        setCases([]); 
      } finally {
        setLoading(false);
      }
    };

    loadCases();

    // เชื่อมต่อ WebSocket เพื่อรับการอัปเดตแบบ real-time
    const token = localStorage.getItem("access_token");
    if (token) {
      webSocketClient.connect(token);
      
      // Listen สำหรับ status updates (เมื่อเคสถูก assign หรืออัปเดต)
      webSocketClient.onStatusUpdate((data) => {
        console.log("ได้รับการอัปเดตสถานะเคส:", data);
        // Refresh ข้อมูลเมื่อมีการอัปเดตสถานะ
        loadCases();
      });

      // Listen สำหรับ notifications (เมื่อมีเคสใหม่ถูก assign ให้ rescue team)
      webSocketClient.on("notification", (data) => {
        console.log("ได้รับการแจ้งเตือน:", data);
        // ถ้าเป็น notification เกี่ยวกับการ assign ให้ refresh
        if (data.type === "ASSIGNMENT" || data.type === "RESCUE_REQUEST" || data.metadata?.status === "ASSIGNED") {
          loadCases();
          toast({
            title: data.title || "เคสใหม่",
            description: data.body || "มีเคสใหม่ที่ถูกมอบหมายให้คุณ",
          });
        }
      });

      // Listen สำหรับ emergency updates
      webSocketClient.onEmergency((data) => {
        console.log("ได้รับเคสฉุกเฉินใหม่:", data);
        loadCases();
      });
    }

    return () => {
      webSocketClient.disconnect();
    };
  }, [toast]);

  // ---------------------------
  // COMPLETE CASE
  // ---------------------------
  const handleCompleteCase = async (caseId: string) => {
    try {
      await updateEmergencyStatus(caseId, { status: "COMPLETED" });

      setCases(prev =>
        prev.map(c =>
          c.id === caseId ? { ...c, status: "completed" } : c
        )
      );

      toast({
        title: "Mission Completed",
        description: `Case ${caseId} marked as completed`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to complete mission",
        variant: "destructive",
      });
    }
  };

  // ---------------------------
  // CANCEL CASE
  // ---------------------------
  const handleCancelCase = async (caseId: string) => {
    try {
      await cancelCase(caseId);

      setCases(prev =>
        prev.map(c =>
          c.id === caseId ? { ...c, status: "cancelled" } : c
        )
      );

      toast({
        title: "Mission Cancelled",
        description: `Case ${caseId} has been cancelled.`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to cancel mission",
        variant: "destructive",
      });
    }
  };

  return {
    cases,
    loading,
    error,
    handleCompleteCase,
    handleCancelCase,
  };
};

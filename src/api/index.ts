import axios from "axios"

const API = "https://bk-ip-deduct.onrender.com/api"


export const startTestApi = async () => {

  try {
    const response = await axios.post(`${API}/start`)
    return response.data?.attemptId
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
      error?.message ||
      "Something went wrong"
    );
  }
}

export const checkIpApi = async (attemptId: string) => {
  try {
    const response = await axios.post(`${API}/checkIp`, { attemptId },{timeout:4000})
    return response.data
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
      error.message ||
      "Something went wrong"
    );
  }
}
export const logEventApi = async (
  attemptId: string,
  eventType: string,
  metadata: any = {}
) => {
  try {
    await axios.post (`${API}/logEvent`, {
      attemptId,
      eventType,
      metadata,
      timestamp:new Date()
    });
  } catch (error) {
    console.error("Event log failed",error);
  }
};
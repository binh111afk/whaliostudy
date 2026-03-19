import axios from '../config/axiosConfig';
import { getFullApiUrl } from '../config/apiConfig';

const buildErrorPayload = (error, fallbackMessage) => ({
  success: false,
  message: error?.response?.data?.message || fallbackMessage,
});

export const mindMapService = {
  async getCurrentMap() {
    try {
      const response = await axios.get(getFullApiUrl('/api/mind-maps/current'), {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      console.error('Get current mind map error:', error);
      return buildErrorPayload(error, 'Không thể tải sơ đồ tư duy');
    }
  },

  async createMap(payload) {
    try {
      const response = await axios.post(getFullApiUrl('/api/mind-maps'), payload || {}, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      console.error('Create mind map error:', error);
      return buildErrorPayload(error, 'Không thể tạo sơ đồ tư duy');
    }
  },

  async updateMap(id, payload) {
    try {
      const response = await axios.put(getFullApiUrl(`/api/mind-maps/${id}`), payload || {}, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      console.error('Update mind map error:', error);
      return buildErrorPayload(error, 'Không thể lưu sơ đồ tư duy');
    }
  },

  async generateFromTopic(topic) {
    try {
      const response = await axios.post(
        getFullApiUrl('/api/mind-maps/ai/generate'),
        { topic },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error('Generate mind map by AI error:', error);
      return buildErrorPayload(error, 'Whalio AI chưa tạo được sơ đồ lúc này');
    }
  },

  async expandNode(payload) {
    try {
      const response = await axios.post(
        getFullApiUrl('/api/mind-maps/ai/expand'),
        payload || {},
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error('Expand mind map node by AI error:', error);
      return buildErrorPayload(error, 'Whalio AI chưa khai triển được ý này');
    }
  },
};

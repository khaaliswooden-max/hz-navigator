import { apiClient } from './api';

// Types
export interface Hubzone {
  id: string;
  name: string;
  zone_type: string;
  state: string;
  county: string;
  status: string;
  geometry?: string;
}

export interface HubzoneListResponse {
  data: Hubzone[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LocationCheckRequest {
  latitude: number;
  longitude: number;
}

export interface LocationCheckResponse {
  isInHubzone: boolean;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  matchingZones: Partial<Hubzone>[];
  checkedAt: string;
}

export interface AddressCheckRequest {
  address: string;
}

// HUBZone Service
export const hubzoneService = {
  /**
   * Get all HUBZones with pagination
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<HubzoneListResponse> {
    return apiClient.get<HubzoneListResponse>('/hubzones', { params });
  },

  /**
   * Get a single HUBZone by ID
   */
  async getById(id: string): Promise<Hubzone> {
    return apiClient.get<Hubzone>(`/hubzones/${id}`);
  },

  /**
   * Check if coordinates are in a HUBZone
   */
  async checkLocation(
    latitude: number,
    longitude: number
  ): Promise<LocationCheckResponse> {
    return apiClient.post<LocationCheckResponse>('/hubzones/check', {
      latitude,
      longitude,
    });
  },

  /**
   * Check if an address is in a HUBZone
   * This would typically geocode the address first
   */
  async checkAddress(address: string): Promise<LocationCheckResponse> {
    return apiClient.post<LocationCheckResponse>('/hubzones/check-address', {
      address,
    });
  },
};

export default hubzoneService;


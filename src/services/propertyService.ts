import axios from 'axios';
import { Property } from '@/Models/models';

class PropertyService {
  private PROPERTY_API = `${process.env.NEXT_PUBLIC_PROPERTY_API_BASE_URL || ""}/api/property`;

  async getProperties(): Promise<Property[]> {
    const res = await axios.get(`${this.PROPERTY_API}/all`);
    return res.data;
  }

  async getPropertyById(propertyId: string): Promise<Property> {
 
    const res = await axios.post(`${this.PROPERTY_API}/get`, { propertyId });
    return res.data.property;
  }

  async getPropertiesByQuery(query: string): Promise<Property[]> {
    const res = await axios.get(`${this.PROPERTY_API}/search?query=${query}`);
    return res.data;
  }
}

export default PropertyService;
import axios from 'axios';
import { Owner } from '@/Models/models';

class OwnerService {
  private PROPERTY_API = `/api/owner`;

  async getOwners(): Promise<Owner[]> {
    const res = await axios.get(`${this.PROPERTY_API}/all`);
    return res.data;
  }

  async getOwnerById(ownerId: string): Promise<Owner> {
    const res = await axios.post(`${this.PROPERTY_API}/get`, { ownerId });
    return res.data;
  }
}

export default OwnerService;

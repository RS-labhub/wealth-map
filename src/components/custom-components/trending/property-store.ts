import { ConfidenceLevel, generateTrendingProperties, getHotProperties, type Property } from "./property-generator";
import { Owner, Property as PropertyType } from "@/Models/models";
import PropertyService from "@/services/propertyService";
import { getCoordinates } from "../home/interactive-map";
import { faker } from "@faker-js/faker";
import OwnerService from "@/services/ownerService";
import { generateDate } from "./property-generator";

const ownerTypes = ['Individual', 'Entity'];

const propertyService = new PropertyService();
const ownerService = new OwnerService();

let owners: Owner[] = [];
let properties: Property[] = [];
let trendingProperties: Property[] = [];
let hotProperties: Property[] = [];
let initialized = false;

const fetchOwners = async () => {
  const value = localStorage.getItem('owner-storage');
  if (value) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        owners = parsed;
        return;
      }
    } catch {
      // Continue to fetch from service
    }
  }

  owners = await ownerService.getOwners();
  localStorage.setItem('owner-storage', JSON.stringify(owners));
};

const fetchProperties = async () => {
  const value = localStorage.getItem('property-storage');
  let rawProperties: PropertyType[] = [];

  if (value) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        rawProperties = parsed;
      }
    } catch {
      // Ignore and fetch from service
    }
  }

  if (rawProperties.length === 0) {
    rawProperties = await propertyService.getProperties();
    localStorage.setItem('property-storage', JSON.stringify(rawProperties));
  }

  const enrichedProps = await Promise.all(
    rawProperties.map(async (property) => {
      const coordinates = await getCoordinates(property);
      const owner = owners.find((o) => o.id === property.ownerId);

      return {
        id: property.id,
        address: property.address,
        coordinates,
        value: property.price.toString(),
        region: property.city,
        sqft: property.area,
        views: faker.number.int({ min: 100, max: 1000 }),
        confidenceLevel: property.confidenceLevel || ["High", "Medium", "Low"][faker.number.int({ min: 0, max: 2 })] as ConfidenceLevel,
        lastUpdated: property.lastUpdated,
        ownerId: property.ownerId,
        ownerName: owner?.name || faker.person.fullName(),
        ownerType: owner?.ownerType || ownerTypes[faker.number.int({ min: 0, max: 1 })],
        type: property.type,
        trendingScore: faker.number.int({ min: 100, max: 1000 }),
      };
    })
  );

  properties = enrichedProps;
};

async function init() {
  if (!initialized) {
    await fetchOwners();
    await fetchProperties();
    populateTrendingAndHot();
    initialized = true;
  }
}

function populateTrendingAndHot() {
  if (trendingProperties.length === 0 && properties.length > 0) {
    trendingProperties = properties.map((property, index) => {
      let lastUpdated;
      if (index % 4 === 0) {
        lastUpdated = generateDate(faker.number.int({ min: 1, max: 7 }));
      } else if (index % 4 === 1) {
        lastUpdated = generateDate(faker.number.int({ min: 8, max: 30 }));
      } else if (index % 4 === 2) {
        lastUpdated = generateDate(faker.number.int({ min: 31, max: 90 }));
      } else {
        lastUpdated = generateDate(faker.number.int({ min: 91, max: 190 }));
      }

      let views;
      if (index % 3 === 0) {
        views = faker.number.int({ min: 501, max: 900 });
      } else if (index % 3 === 1) {
        views = faker.number.int({ min: 300, max: 500 });
      } else {
        views = faker.number.int({ min: 1, max: 299 });
      }

      const daysDiff = Math.max(
        1,
        Math.ceil(Math.abs(Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24))
      );
      const trendingScore = views / daysDiff;

      return {
        ...property,
        views,
        lastUpdated,
        trendingScore,
      };
    });

    hotProperties = [...trendingProperties]
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 4);
  }
}

export async function getProperties() {
  await init();

  return {
    trendingProperties,
    hotProperties,
  };
}

export async function getPropertyById(id: string): Promise<Property | undefined> {
  const { trendingProperties } = await getProperties();
  return trendingProperties.find((p) => p.id === id);
}

export { Property };

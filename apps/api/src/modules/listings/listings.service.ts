import { db } from "@subito/db";
import {
  categories,
  listings,
  catalogs,
  catalogPricing,
  bundles,
  bundleItems,
  addOns,
  bookings,
} from "@subito/db/schema";
import { eq, and, isNull, or } from "drizzle-orm";
import { NotFoundError } from "../../lib/errors";
import { cacheGet, cacheSet } from "../../lib/redis";

interface ListingsQuery {
  lat?: number;
  lng?: number;
  categoryId?: string;
}

export async function getListings(query: ListingsQuery) {
  const cacheKey = `listings:${query.categoryId || "all"}`;
  const cached = await cacheGet<unknown>(cacheKey);
  if (cached) return cached;

  const categoryList = await db.query.categories.findMany({
    where: and(
      eq(categories.isActive, true),
      query.categoryId
        ? eq(categories.id, query.categoryId)
        : isNull(categories.parentId)
    ),
    with: {
      listings: {
        where: eq(listings.isActive, true),
        with: {
          catalogs: {
            where: eq(catalogs.isActive, true),
            with: {
              pricing: true,
            },
          },
          addOns: {
            where: eq(addOns.isActive, true),
          },
        },
      },
    },
    orderBy: (categories, { asc }) => [asc(categories.sortOrder)],
  });

  const activeBundles = await db.query.bundles.findMany({
    where: eq(bundles.isActive, true),
    with: {
      items: {
        with: {
          catalog: true,
        },
      },
    },
  });

  const result = {
    categories: categoryList.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon,
      image: cat.image,
      listings: cat.listings.map((listing) => ({
        id: listing.id,
        name: listing.name,
        slug: listing.slug,
        description: listing.description,
        shortDescription: listing.shortDescription,
        image: listing.image,
        images: listing.images,
        basePrice: listing.basePrice,
        duration: listing.duration,
        tags: listing.tags,
        catalogs: listing.catalogs.map((catalog) => ({
          id: catalog.id,
          name: catalog.name,
          description: catalog.description,
          price: catalog.price,
          discountedPrice: catalog.discountedPrice,
          unit: catalog.unit,
          minQuantity: catalog.minQuantity,
          maxQuantity: catalog.maxQuantity,
          stepQuantity: catalog.stepQuantity,
          pricing: catalog.pricing,
        })),
        addOns: listing.addOns,
      })),
    })),
    bundles: activeBundles.map((bundle) => ({
      id: bundle.id,
      name: bundle.name,
      slug: bundle.slug,
      description: bundle.description,
      image: bundle.image,
      originalPrice: bundle.originalPrice,
      bundlePrice: bundle.bundlePrice,
      discountPercentage: bundle.discountPercentage,
      items: bundle.items.map((item) => ({
        catalogId: item.catalogId,
        quantity: item.quantity,
        catalog: item.catalog,
      })),
    })),
  };

  await cacheSet(cacheKey, result, 600);
  return result;
}

export async function getListingById(id: string) {
  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, id),
    with: {
      category: true,
      catalogs: {
        where: eq(catalogs.isActive, true),
        with: {
          pricing: true,
        },
      },
      addOns: {
        where: eq(addOns.isActive, true),
      },
    },
  });

  if (!listing) {
    throw new NotFoundError("Listing");
  }

  return listing;
}

export async function getCategories() {
  const categoryList = await db.query.categories.findMany({
    where: eq(categories.isActive, true),
    orderBy: (categories, { asc }) => [asc(categories.sortOrder)],
  });

  return categoryList;
}

export async function getCategoryById(id: string) {
  const category = await db.query.categories.findFirst({
    where: eq(categories.id, id),
    with: {
      listings: {
        where: eq(listings.isActive, true),
        with: {
          catalogs: {
            where: eq(catalogs.isActive, true),
          },
        },
      },
    },
  });

  if (!category) {
    throw new NotFoundError("Category");
  }

  return category;
}

export async function getExtensions(bookingId: string) {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: {
      items: {
        with: {
          catalog: {
            with: {
              listing: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    throw new NotFoundError("Booking");
  }

  const listingIds = booking.items.map((item) => item.catalog.listing?.id).filter(Boolean);
  
  if (listingIds.length === 0) {
    return { extensions: [] };
  }

  const extensionAddOns = await db.query.addOns.findMany({
    where: and(
      eq(addOns.isActive, true),
      or(...listingIds.map((id) => eq(addOns.listingId, id!)))
    ),
  });

  return { extensions: extensionAddOns };
}

export async function getServiceById(id: string) {
  const cacheKey = `service:${id}`;
  const cached = await cacheGet<unknown>(cacheKey);
  if (cached) return cached;

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, id),
    with: {
      category: true,
      catalogs: {
        where: eq(catalogs.isActive, true),
        with: {
          pricing: true,
        },
        orderBy: (catalogs, { asc }) => [asc(catalogs.sortOrder)],
      },
      addOns: {
        where: eq(addOns.isActive, true),
      },
    },
  });

  if (!listing) {
    throw new NotFoundError("Service");
  }

  const service = {
    id: listing.id,
    name: listing.name,
    slug: listing.slug,
    description: listing.description,
    shortDescription: listing.shortDescription,
    image: listing.image,
    images: listing.images,
    basePrice: listing.basePrice,
    duration: listing.duration,
    tags: listing.tags,
    faqs: listing.faqs,
    highlights: listing.highlights,
    howItWorks: listing.howItWorks,
    category: listing.category,
    catalogs: listing.catalogs.map((catalog) => ({
      id: catalog.id,
      name: catalog.name,
      description: catalog.description,
      price: catalog.price,
      discountedPrice: catalog.discountedPrice,
      unit: catalog.unit,
      minQuantity: catalog.minQuantity,
      maxQuantity: catalog.maxQuantity,
      stepQuantity: catalog.stepQuantity,
      dependentOn: catalog.dependentOn,
      pricing: catalog.pricing.map((p) => ({
        dependentOn: p.dependentOn,
        dependentValue: p.dependentValue,
        price: p.price,
      })),
    })),
    addOns: listing.addOns.map((addOn) => ({
      id: addOn.id,
      name: addOn.name,
      description: addOn.description,
      price: addOn.price,
      image: addOn.image,
    })),
  };

  await cacheSet(cacheKey, service, 600);
  return service;
}

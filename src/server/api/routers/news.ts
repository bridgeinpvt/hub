import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { logger } from "@/lib/logger";

// News API interface
interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: Array<{
    source: {
      id: string | null;
      name: string;
    };
    author: string | null;
    title: string;
    description: string | null;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    content: string | null;
  }>;
}

async function fetchNewsFromAPI(category: string = "technology", pageSize: number = 10) {
  const newsApiKey = process.env.NEWS_API_KEY;
  const newsApiHost = process.env.NEWS_API_HOST || "https://newsapi.org";
  
  if (!newsApiKey) {
    logger.error("NEWS_API_KEY environment variable is not set");
    return { articles: [] };
  }

  try {
    // Focus only on business, technology, and startup-related topics
    let apiUrl = `${newsApiHost}/v2/top-headlines?pageSize=${pageSize}&apiKey=${newsApiKey}`;
    
    if (["technology", "business"].includes(category)) {
      apiUrl += `&category=${category}&language=en&country=us`;
    } else if (category === "startups") {
      // Use everything endpoint for startup-specific searches with comprehensive terms
      const startupQuery = encodeURIComponent('startup OR "venture capital" OR entrepreneur OR "seed funding" OR "series A" OR "series B" OR "series C" OR IPO OR "initial public offering" OR "unicorn company" OR fintech OR "Y Combinator" OR "Andreessen Horowitz" OR "Sequoia Capital"');
      apiUrl = `${newsApiHost}/v2/everything?q=${startupQuery}&sortBy=publishedAt&language=en&pageSize=${pageSize}&apiKey=${newsApiKey}`;
    } else {
      // Fallback to business category for any other category
      apiUrl += `&category=business&language=en&country=us`;
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: NewsAPIResponse = await response.json();
    return data;
  } catch (error) {
    logger.error("Error fetching news from RapidAPI:", error);
    return { articles: [] };
  }
}

async function syncMultipleCategories(ctx: any, categories: string[], pageSize: number = 10) {
  const results = [];
  
  for (const category of categories) {
    try {
      const newsData = await fetchNewsFromAPI(category, pageSize);
      let insertedCount = 0;
      
      for (const article of newsData.articles) {
        // Check if article already exists
        const existingNews = await ctx.db.news.findFirst({
          where: { url: article.url }
        });
        
        if (existingNews) continue;
        
        // Find or create news source
        let newsSource = await ctx.db.newsSource.findFirst({
          where: { name: article.source.name }
        });
        
        if (!newsSource) {
          newsSource = await ctx.db.newsSource.create({
            data: {
              name: article.source.name,
              url: new URL(article.url).origin,
              image: article.urlToImage,
            }
          });
        }
        
        // Create news entry with category tag
        await ctx.db.news.create({
          data: {
            title: article.title,
            description: article.description || "",
            url: article.url,
            urlToImage: article.urlToImage,
            author: article.author,
            sourceId: newsSource.id,
            publishedAt: new Date(article.publishedAt),
            createdAt: new Date(article.publishedAt),
          },
        });
        
        insertedCount++;
      }
      
      results.push({
        category,
        insertedCount,
        totalArticles: newsData.articles.length
      });
      
    } catch (error) {
      logger.error(`Error syncing category ${category}:`, error);
      results.push({
        category,
        insertedCount: 0,
        totalArticles: 0,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  return results;
}

export const newsRouter = createTRPCRouter({
  // Sync all NoCage categories
  syncAllCategories: publicProcedure
    .input(z.object({
      pageSize: z.number().min(1).max(50).optional().default(15)
    }).optional().default({}))
    .mutation(async ({ ctx, input = {} }) => {
      const { pageSize = 15 } = input;
      const categories = ["business", "technology", "startups"];
      
      try {
        const results = await syncMultipleCategories(ctx, categories, pageSize);
        const totalInserted = results.reduce((acc, result) => acc + result.insertedCount, 0);
        
        return {
          success: true,
          totalInserted,
          categoryResults: results,
          syncedAt: new Date().toISOString()
        };
      } catch (error) {
        logger.error("Error syncing all categories:", error);
        return {
          success: false,
          totalInserted: 0,
          categoryResults: [],
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }),

  // Sync news from News API to database
  syncNews: publicProcedure
    .input(z.object({
      category: z.enum(["business", "technology", "startups"]).optional().default("technology"),
      pageSize: z.number().min(1).max(50).optional().default(20)
    }).optional().default({}))
    .mutation(async ({ ctx, input = {} }) => {
      const { category = "general", pageSize = 20 } = input;
      
      try {
        const newsData = await fetchNewsFromAPI(category, pageSize);
        const insertedNews = [];
        
        for (const article of newsData.articles) {
          // Check if article already exists
          const existingNews = await ctx.db.news.findFirst({
            where: { url: article.url }
          });
          
          if (existingNews) {
            continue; // Skip if already exists
          }
          
          // Find or create news source
          let newsSource = await ctx.db.newsSource.findFirst({
            where: { name: article.source.name }
          });
          
          if (!newsSource) {
            newsSource = await ctx.db.newsSource.create({
              data: {
                name: article.source.name,
                url: new URL(article.url).origin,
                image: article.urlToImage,
              }
            });
          }
          
          // Create news entry
          const news = await ctx.db.news.create({
            data: {
              title: article.title,
              description: article.description || "",
              url: article.url,
              urlToImage: article.urlToImage,
              author: article.author,
              sourceId: newsSource.id,
              publishedAt: new Date(article.publishedAt),
              createdAt: new Date(article.publishedAt),
            },
            include: {
              source: {
                select: {
                  id: true,
                  name: true,
                  url: true,
                  image: true,
                },
              },
            },
          });
          
          insertedNews.push(news);
        }
        
        return {
          success: true,
          insertedCount: insertedNews.length,
          items: insertedNews,
        };
      } catch (error) {
        logger.error("Error syncing news:", error);
        return {
          success: false,
          insertedCount: 0,
          items: [],
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }),

  // Get news from database
  getNews: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).optional().default(10)
    }).optional().default({}))
    .query(async ({ ctx, input = {} }) => {
      const { limit = 10 } = input;
      
      try {
        const news = await ctx.db.news.findMany({
          orderBy: { createdAt: "desc" },
          take: limit,
          include: {
            source: {
              select: {
                id: true,
                name: true,
                url: true,
                image: true,
              },
            },
          },
        });

        return {
          items: news,
        };
      } catch (error) {
        logger.error("Error fetching news:", error);
        return {
          items: [],
        };
      }
    }),

  // Get fresh news (sync and return latest)
  getFreshNews: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).optional().default(10),
      category: z.enum(["business", "technology", "startups"]).optional().default("business")
    }).optional().default({}))
    .query(async ({ ctx, input = {} }) => {
      const { limit = 10, category = "business" } = input;
      
      try {
        // First sync fresh news from News API
        const syncResult = await fetchNewsFromAPI(category, 20);
        
        // Insert new articles into database
        for (const article of syncResult.articles) {
          const existingNews = await ctx.db.news.findFirst({
            where: { url: article.url }
          });
          
          if (existingNews) continue;
          
          let newsSource = await ctx.db.newsSource.findFirst({
            where: { name: article.source.name }
          });
          
          if (!newsSource) {
            newsSource = await ctx.db.newsSource.create({
              data: {
                name: article.source.name,
                url: new URL(article.url).origin,
                image: article.urlToImage,
              }
            });
          }
          
          await ctx.db.news.create({
            data: {
              title: article.title,
              description: article.description || "",
              url: article.url,
              urlToImage: article.urlToImage,
              author: article.author,
              sourceId: newsSource.id,
              publishedAt: new Date(article.publishedAt),
              createdAt: new Date(article.publishedAt),
            },
          });
        }
        
        // Return latest news from database
        const news = await ctx.db.news.findMany({
          orderBy: { createdAt: "desc" },
          take: limit,
          include: {
            source: {
              select: {
                id: true,
                name: true,
                url: true,
                image: true,
              },
            },
          },
        });

        return {
          items: news,
        };
      } catch (error) {
        logger.error("Error fetching fresh news:", error);
        // Fallback to existing news in database
        const news = await ctx.db.news.findMany({
          orderBy: { createdAt: "desc" },
          take: limit,
          include: {
            source: {
              select: {
                id: true,
                name: true,
                url: true,
                image: true,
              },
            },
          },
        });

        return {
          items: news,
        };
      }
    }),

  // Search news
  search: publicProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(50).optional().default(20)
    }))
    .query(async ({ ctx, input }) => {
      const { query, limit } = input;
      
      const news = await ctx.db.news.findMany({
        where: {
          OR: [
            {
              title: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: query,
                mode: "insensitive",
              },
            },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          source: {
            select: {
              id: true,
              name: true,
              url: true,
              image: true,
            },
          },
        },
      });

      return news;
    }),

  // Get news by ID
  getNewsById: publicProcedure
    .input(z.object({ newsId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { newsId } = input;
      
      const news = await ctx.db.news.findUnique({
        where: { id: newsId },
        include: {
          source: {
            select: {
              id: true,
              name: true,
              url: true,
              image: true,
            },
          },
        },
      });

      return news;
    }),
});
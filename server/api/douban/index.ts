import ExternalAPI from '@server/api/externalapi';
import TheMovieDb from '@server/api/themoviedb';
import type {
  TmdbMovieResult,
  TmdbSearchMovieResponse,
  TmdbSearchTvResponse,
  TmdbTvResult,
} from '@server/api/themoviedb/interfaces';
import cacheManager from '@server/lib/cache';
import logger from '@server/logger';
import axios from 'axios';

interface DoubanRexxarItem {
  id: string;
  title: string;
  cover: {
    url: string;
    width: number;
    height: number;
  }; // Structure might vary, LunaTV uses pic.normal/large, let's verify
  pic?: {
    normal: string;
    large: string;
  };
  rating?: {
    value: number;
  };
  year?: string;
  card_subtitle?: string; // Often contains date/country/genres
  type: 'movie' | 'tv';
}

class DoubanAPI extends ExternalAPI {
  constructor() {
    super(
      'https://m.douban.com/rexxar/api/v2',
      {},
      {
        nodeCache: cacheManager.getCache('tmdb').data,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Referer: 'https://movie.douban.com/',
        },
      }
    );
  }

  private async getSubjectCollection({
    collection,
    page = 1,
    limit = 20,
  }: {
    collection: string;
    page?: number;
    limit?: number;
  }): Promise<DoubanRexxarItem[]> {
    try {
      const params = {
        start: ((page - 1) * limit).toString(),
        count: limit.toString(),
        updated_at: '',
        items_only: '1',
        for_mobile: '1',
      };

      logger.debug(
        `[Douban] Fetching collection: ${collection}, page: ${page}, limit: ${limit}, start: ${
          (page - 1) * limit
        }`
      );

      const response = await this.get<{
        subject_collection_items: DoubanRexxarItem[];
      }>(`/subject_collection/${collection}/items`, {
        params: params,
      });

      logger.debug(
        `[Douban] Response for ${collection} items: ${response.subject_collection_items?.length}`
      );

      return response.subject_collection_items || [];
    } catch (e) {
      throw new Error(
        `[Douban] Failed to fetch collection ${collection}: ${e.message}`
      );
    }
  }

  private async getRecentHot({
    kind,
    category,
    type,
    page = 1,
    limit = 20,
  }: {
    kind: 'movie' | 'tv';
    category: string;
    type: string;
    page?: number;
    limit?: number;
  }): Promise<DoubanRexxarItem[]> {
    try {
      const params = {
        start: ((page - 1) * limit).toString(),
        limit: limit.toString(),
        category: category,
        type: type,
      };

      logger.debug(
        `[Douban] Fetching recent_hot kind: ${kind}, category: ${category}, type: ${type}, page: ${page}, limit: ${limit}`
      );

      // recent_hot endpoint: /subject/recent_hot/{kind}
      const responseReal = await this.get<{ items: DoubanRexxarItem[] }>(
        `/subject/recent_hot/${kind}`,
        {
          params: params,
        }
      );

      logger.debug(
        `[Douban] Response for recent_hot ${kind}/${category} items: ${responseReal.items?.length}`
      );

      return responseReal.items || [];
    } catch (e) {
      throw new Error(
        `[Douban] Failed to fetch recent_hot ${kind}/${category}: ${e.message}`
      );
    }
  }

  private async getRecommend({
    kind,
    page = 1,
    limit = 20,
    category = '',
    format = '',
    region = '',
    year = '',
    sort = '',
  }: {
    kind: 'movie' | 'tv';
    page?: number;
    limit?: number;
    category?: string;
    format?: string;
    region?: string;
    year?: string;
    sort?: string;
  }): Promise<DoubanRexxarItem[]> {
    try {
      const selectedCategories: Record<string, string> = {};
      if (category && category !== 'all') selectedCategories['类型'] = category;
      if (format && format !== 'all') selectedCategories['形式'] = format;
      if (region && region !== 'all') selectedCategories['地区'] = region;

      const tags: string[] = [];
      if (category && category !== 'all') tags.push(category);
      if (!category && format && format !== 'all') tags.push(format);
      if (region && region !== 'all') tags.push(region);
      if (year && year !== 'all') tags.push(year);

      const params = {
        refresh: '0',
        start: ((page - 1) * limit).toString(),
        count: limit.toString(),
        selected_categories: JSON.stringify(selectedCategories),
        uncollect: 'false',
        score_range: '0,10',
        tags: tags.join(','),
        sort: sort === 'T' ? '' : sort,
      };

      logger.debug(
        `[Douban] Fetching recommend kind: ${kind}, page: ${page}, tags: ${params.tags}`
      );

      const response = await this.get<{ items: DoubanRexxarItem[] }>(
        `/${kind}/recommend`,
        {
          params: params,
        }
      );

      return response.items || [];
    } catch (e) {
      throw new Error(
        `[Douban] Failed to fetch recommend ${kind}: ${e.message}`
      );
    }
  }

  public async getMovieTrending({
    page = 1,
    category = 'movie_hot',
    genre = '',
    region = '',
    year = '',
    sort = '',
  }: {
    page?: number;
    category?: string;
    genre?: string;
    region?: string;
    year?: string;
    sort?: string;
  } = {}): Promise<TmdbSearchMovieResponse> {
    try {
      let items: DoubanRexxarItem[] = [];

      // Map categories to endpoints
      if (category === 'movie_all') {
        items = await this.getRecommend({
          kind: 'movie',
          page,
          category: genre,
          region,
          year,
          sort,
        });
      } else if (category === 'movie_hot') {
        items = await this.getRecentHot({
          kind: 'movie',
          category: '热门',
          type: '全部',
          page,
        });
      } else if (category === 'movie_latest') {
        items = await this.getRecentHot({
          kind: 'movie',
          category: '最新',
          type: '全部',
          page,
        });
      } else if (category === 'movie_high_score') {
        items = await this.getRecentHot({
          kind: 'movie',
          category: '豆瓣高分',
          type: '全部',
          page,
        });
      } else if (category === 'movie_cold') {
        items = await this.getRecentHot({
          kind: 'movie',
          category: '冷门佳片',
          type: '全部',
          page,
        });
      } else if (category === 'movie_showing') {
        items = await this.getSubjectCollection({
          collection: 'movie_showing',
          page,
        });
      } else {
        items = await this.getRecentHot({
          kind: 'movie',
          category: '热门',
          type: '全部',
          page,
        });
      }

      const tmdb = new TheMovieDb();
      const results: TmdbMovieResult[] = [];

      for (const item of items) {
        // Skip items without title (recommend API can return placeholders/ads)
        if (!item.title) continue;

        const title = item.title;
        const yearVal = item.year ? parseInt(item.year) : undefined;
        const doubanRating = item.rating?.value;

        // Search TMDb
        let matchedResult: TmdbMovieResult | undefined;

        const searchResults = await tmdb.searchMovies({
          query: title,
          language: 'zh-CN',
          page: 1,
          year: yearVal,
        });

        if (searchResults.results.length === 0 && yearVal) {
          const retryResults = await tmdb.searchMovies({
            query: title,
            language: 'zh-CN',
            page: 1,
          });
          if (retryResults.results.length > 0) {
            matchedResult = retryResults.results[0];
          }
        } else if (searchResults.results.length > 0) {
          matchedResult = searchResults.results[0];
        }

        if (matchedResult) {
          matchedResult.doubanRating = doubanRating;
          matchedResult.doubanId = item.id;
          results.push(matchedResult);
        }
      }

      return {
        page,
        total_results: 1000,
        total_pages: 50,
        results,
      };
    } catch (e) {
      throw new Error(`[Douban] Failed to fetch trending movies: ${e.message}`);
    }
  }

  public async getTvTrending({
    page = 1,
    category = 'tv_hot',
    genre = '',
    region = '',
    year = '',
    sort = '',
  }: {
    page?: number;
    category?: string;
    genre?: string;
    region?: string;
    year?: string;
    sort?: string;
  } = {}): Promise<TmdbSearchTvResponse> {
    try {
      let items: DoubanRexxarItem[] = [];

      // TV Mapping
      switch (category) {
        case 'tv_hot':
          items = await this.getRecentHot({
            kind: 'tv',
            category: '最近热门',
            type: 'tv',
            page,
          });
          break;
        case 'tv_domestic':
          items = await this.getRecentHot({
            kind: 'tv',
            category: '最近热门',
            type: 'tv_domestic',
            page,
          });
          break;
        case 'tv_american':
          items = await this.getRecentHot({
            kind: 'tv',
            category: '最近热门',
            type: 'tv_american',
            page,
          });
          break;
        case 'tv_japanese':
          items = await this.getRecentHot({
            kind: 'tv',
            category: '最近热门',
            type: 'tv_japanese',
            page,
          });
          break;
        case 'tv_korean':
          items = await this.getRecentHot({
            kind: 'tv',
            category: '最近热门',
            type: 'tv_korean',
            page,
          });
          break;
        case 'tv_animation':
          items = await this.getRecentHot({
            kind: 'tv',
            category: '最近热门',
            type: 'tv_animation',
            page,
          });
          break;
        case 'tv_documentary':
          items = await this.getRecentHot({
            kind: 'tv',
            category: '最近热门',
            type: 'tv_documentary',
            page,
          });
          break;
        case 'show_domestic':
          items = await this.getRecentHot({
            kind: 'tv',
            category: '最近热门',
            type: 'show_domestic',
            page,
          });
          break;
        case 'show_foreign':
          items = await this.getRecentHot({
            kind: 'tv',
            category: '最近热门',
            type: 'show_foreign',
            page,
          });
          break;
        case 'tv_all':
          items = await this.getRecommend({
            kind: 'tv',
            page,
            category: genre,
            region,
            year,
            sort,
            format: '电视剧',
          });
          break;
        case 'show_all':
          items = await this.getRecommend({
            kind: 'tv',
            page,
            category: genre,
            region,
            year,
            sort,
            format: '综艺',
          });
          break;
        default:
          items = await this.getRecentHot({
            kind: 'tv',
            category: '最近热门',
            type: 'tv',
            page,
          });
          break;
      }

      const tmdb = new TheMovieDb();
      const results: TmdbTvResult[] = [];

      for (const item of items) {
        if (!item.title) continue;

        const title = item.title;
        const yearVal = item.year ? parseInt(item.year) : undefined;
        const doubanRating = item.rating?.value;

        const searchResults = await tmdb.searchTvShows({
          query: title,
          language: 'zh-CN',
          page: 1,
          year: yearVal,
        });

        if (searchResults.results.length > 0) {
          const matchedResult = searchResults.results[0];
          matchedResult.doubanRating = doubanRating;
          matchedResult.doubanId = item.id;
          results.push(matchedResult);
        }
      }

      return {
        page,
        total_results: 1000,
        total_pages: 50,
        results,
      };
    } catch (e) {
      throw new Error(`[Douban] Failed to fetch trending TV: ${e.message}`);
    }
  }

  public async getRating(
    tmdbId: number,
    mediaType: 'movie' | 'tv'
  ): Promise<{ id?: string; rating: number } | undefined> {
    try {
      const response = await axios.get(
        'https://douban-idatabase.kfstorm.com/api/item',
        {
          params: {
            tmdb_id: tmdbId,
            tmdb_media_type: mediaType,
          },
          timeout: 5000,
        }
      );

      if (response.data && response.data.length > 0) {
        return {
          id: response.data[0].douban_id,
          rating: response.data[0].rating,
        };
      }
      return undefined;
    } catch (e) {
      // Fail silently
      return undefined;
    }
  }
}

export default DoubanAPI;

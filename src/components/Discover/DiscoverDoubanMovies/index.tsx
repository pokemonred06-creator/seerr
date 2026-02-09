import Header from '@app/components/Common/Header';
import ListView from '@app/components/Common/ListView';
import PageTitle from '@app/components/Common/PageTitle';
import useDiscover from '@app/hooks/useDiscover';
import Error from '@app/pages/_error';
import defineMessages from '@app/utils/defineMessages';
import type { MovieResult } from '@server/models/Search';
import { useIntl } from 'react-intl';

import { useRouter } from 'next/router';
import {
  MOVIE_GENRES,
  MOVIE_REGIONS,
  MOVIE_SORTS,
  MOVIE_YEARS,
} from './constants';

const messages = defineMessages('components.Discover.DiscoverDoubanMovies', {
  discoverdoubanmovies: 'Douban Movies',
});

const FilterRow = ({
  label,
  options,
  currentValue,
  onChange,
}: {
  label: string;
  options: { label: string; value: string }[];
  currentValue: string;
  onChange: (val: string) => void;
}) => (
  <div className="scrollbar-hide flex items-center space-x-4 overflow-x-auto pb-2">
    <span className="shrink-0 text-sm font-bold text-gray-400">{label}:</span>
    <div className="flex space-x-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none ${
            currentValue === opt.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

const DiscoverDoubanMovies = () => {
  const intl = useIntl();

  const router = useRouter();
  const category = (router.query.category as string) || 'movie_hot';
  const genre = (router.query.genre as string) || 'all';
  const region = (router.query.region as string) || 'all';
  const year = (router.query.year as string) || 'all';
  const sort = (router.query.sort as string) || 'T';

  const updateQueryParams = (key: string, value: string) => {
    router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, [key]: value },
      },
      undefined,
      { shallow: true }
    );
  };

  const {
    isLoadingInitialData,
    isEmpty,
    isLoadingMore,
    isReachingEnd,
    titles,
    fetchMore,
    error,
  } = useDiscover<
    MovieResult,
    unknown,
    {
      category: string;
      genre: string;
      region: string;
      year: string;
      sort: string;
    }
  >('/api/v1/discover/douban/movies', { category, genre, region, year, sort });

  if (error) {
    return <Error statusCode={500} />;
  }

  const title = intl.formatMessage(messages.discoverdoubanmovies);

  const categories = [
    { id: 'movie_hot', name: '热门' },
    { id: 'movie_latest', name: '最新' },
    { id: 'movie_high_score', name: '高分' },
    { id: 'movie_cold', name: '冷门' },
    { id: 'movie_showing', name: '院线' },
    { id: 'movie_all', name: '全部' },
  ];

  return (
    <>
      <PageTitle title={title} />
      <div className="mb-4 flex flex-col justify-between lg:flex-row lg:items-end">
        <Header>{title}</Header>
      </div>

      <div className="scrollbar-hide mb-6 flex space-x-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => updateQueryParams('category', cat.id)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
              category === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {category === 'movie_all' && (
        <div className="mb-8 space-y-4 rounded-xl bg-gray-900/50 p-4 ring-1 ring-gray-800">
          <FilterRow
            label="类型"
            options={MOVIE_GENRES}
            currentValue={genre}
            onChange={(val) => updateQueryParams('genre', val)}
          />
          <FilterRow
            label="地区"
            options={MOVIE_REGIONS}
            currentValue={region}
            onChange={(val) => updateQueryParams('region', val)}
          />
          <FilterRow
            label="年代"
            options={MOVIE_YEARS}
            currentValue={year}
            onChange={(val) => updateQueryParams('year', val)}
          />
          <FilterRow
            label="排序"
            options={MOVIE_SORTS}
            currentValue={sort}
            onChange={(val) => updateQueryParams('sort', val)}
          />
        </div>
      )}

      <ListView
        items={titles}
        isEmpty={isEmpty}
        isLoading={
          isLoadingInitialData || (isLoadingMore && (titles?.length ?? 0) > 0)
        }
        isReachingEnd={isReachingEnd}
        onScrollBottom={fetchMore}
      />
    </>
  );
};

export default DiscoverDoubanMovies;

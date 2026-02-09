import Header from '@app/components/Common/Header';
import ListView from '@app/components/Common/ListView';
import PageTitle from '@app/components/Common/PageTitle';
import useDiscover from '@app/hooks/useDiscover';
import Error from '@app/pages/_error';
import defineMessages from '@app/utils/defineMessages';
import type { TvResult } from '@server/models/Search';
import { useIntl } from 'react-intl';

import { useRouter } from 'next/router';
import {
  SHOW_GENRES,
  TV_GENRES,
  TV_REGIONS,
  TV_SORTS,
  TV_YEARS,
} from './constants';

const messages = defineMessages('components.Discover.DiscoverDoubanTv', {
  discoverdoubantv: 'Douban Series',
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

const DiscoverDoubanTv = () => {
  const intl = useIntl();
  const router = useRouter();
  const category = (router.query.category as string) || 'tv_hot';
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
    TvResult,
    unknown,
    {
      category: string;
      genre: string;
      region: string;
      year: string;
      sort: string;
    }
  >('/api/v1/discover/douban/tv', { category, genre, region, year, sort });

  if (error) {
    return <Error statusCode={500} />;
  }

  const title = intl.formatMessage(messages.discoverdoubantv);

  const categories = [
    { id: 'tv_all', name: '全部剧集' },
    { id: 'show_all', name: '全部综艺' },
    { id: 'tv_hot', name: '热门' },
    { id: 'tv_domestic', name: '国产' },
    { id: 'tv_american', name: '欧美' },
    { id: 'tv_japanese', name: '日本' },
    { id: 'tv_korean', name: '韩国' },
    { id: 'tv_animation', name: '动漫' },
    { id: 'tv_documentary', name: '纪录片' },
    { id: 'show_domestic', name: '国内综艺' },
    { id: 'show_foreign', name: '国外综艺' },
  ];

  const showFilters = category === 'tv_all' || category === 'show_all';
  const currentGenres = category === 'show_all' ? SHOW_GENRES : TV_GENRES;

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
            onClick={() => {
              // If changing category, reset other filters but update URL
              const newQuery: Record<string, string | string[]> = {
                ...router.query,
                category: cat.id,
              };

              if (cat.id !== category) {
                newQuery.genre = 'all';
                newQuery.region = 'all';
                newQuery.year = 'all';
                newQuery.sort = 'T';
              }

              router.push(
                {
                  pathname: router.pathname,
                  query: newQuery,
                },
                undefined,
                { shallow: true }
              );
            }}
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

      {showFilters && (
        <div className="mb-8 space-y-4 rounded-xl bg-gray-900/50 p-4 ring-1 ring-gray-800">
          <FilterRow
            label="类型"
            options={currentGenres}
            currentValue={genre}
            onChange={(val) => updateQueryParams('genre', val)}
          />
          <FilterRow
            label="地区"
            options={TV_REGIONS}
            currentValue={region}
            onChange={(val) => updateQueryParams('region', val)}
          />
          <FilterRow
            label="年代"
            options={TV_YEARS}
            currentValue={year}
            onChange={(val) => updateQueryParams('year', val)}
          />
          <FilterRow
            label="排序"
            options={TV_SORTS}
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

export default DiscoverDoubanTv;

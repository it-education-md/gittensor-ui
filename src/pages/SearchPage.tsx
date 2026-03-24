import React, { useMemo } from 'react';
import {
  Alert,
  Card,
  Box,
  Button,
  CircularProgress,
  Tab,
  Tabs,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SEO } from '../components';
import { GlobalSearchBar, Page } from '../components/layout';
import { useAllMiners, useAllPrs, useIssues, useReposAndWeights } from '../api';

type SearchMiner = {
  githubId: string;
  githubUsername: string;
  hotkey: string;
  currentTier: string;
  totalScore: number;
};

const toNumber = (value: unknown): number => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const pickString = (record: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return '';
};

const normalizeMiner = (raw: unknown): SearchMiner | null => {
  const record = (raw ?? {}) as Record<string, unknown>;
  const githubId = pickString(record, ['githubId', 'github_id', 'githubID']);
  if (!githubId) return null;

  return {
    githubId,
    githubUsername: pickString(record, [
      'githubUsername',
      'github_username',
      'author',
      'login',
    ]),
    hotkey: pickString(record, ['hotkey']),
    currentTier: pickString(record, ['currentTier', 'current_tier']),
    totalScore: toNumber(record.totalScore ?? record.total_score),
  };
};

const headerCellSx = {
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '0.7rem',
  fontWeight: 600,
  letterSpacing: '0.5px',
  textTransform: 'uppercase' as const,
  color: 'rgba(255, 255, 255, 0.3)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  py: 1.5,
};

const bodyCellSx = {
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '0.85rem',
  color: 'text.primary',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  py: 1.5,
};

const tableCardSx = {
  backgroundColor: 'background.default',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 3,
  overflow: 'hidden',
};

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryFromUrl = searchParams.get('q') || '';
  const query = queryFromUrl;
  const [tabValue, setTabValue] = React.useState<
    'miners' | 'repositories' | 'prs' | 'issues'
  >('miners');

  const minersQuery = useAllMiners();
  const reposQuery = useReposAndWeights();
  const prsQuery = useAllPrs();
  const issuesQuery = useIssues();

  const normalizedMiners = useMemo(
    () =>
      ((minersQuery.data ?? []) as unknown[])
        .map(normalizeMiner)
        .filter((m): m is SearchMiner => Boolean(m)),
    [minersQuery.data],
  );

  const q = query.trim().toLowerCase();
  const hasQuery = q.length >= 2;

  const minerResults = useMemo(() => {
    if (!hasQuery) return [];
    return normalizedMiners
      .filter((m) => {
        const username = m.githubUsername.toLowerCase();
        return (
          m.githubId.toLowerCase().includes(q) ||
          username.includes(q) ||
          m.hotkey.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 12);
  }, [normalizedMiners, q, hasQuery]);

  const repoResults = useMemo(() => {
    if (!hasQuery) return [];
    return (reposQuery.data ?? [])
      .filter(
        (r) =>
          r.fullName.toLowerCase().includes(q) ||
          r.owner.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [reposQuery.data, q, hasQuery]);

  const prResults = useMemo(() => {
    if (!hasQuery) return [];
    return (prsQuery.data ?? [])
      .filter((pr) => {
        const title = (pr.pullRequestTitle || '').toLowerCase();
        const repo = (pr.repository || '').toLowerCase();
        const author = (pr.author || '').toLowerCase();
        return (
          title.includes(q) ||
          repo.includes(q) ||
          author.includes(q) ||
          String(pr.pullRequestNumber || '').includes(q)
        );
      })
      .slice(0, 12);
  }, [prsQuery.data, q, hasQuery]);

  const issueResults = useMemo(() => {
    if (!hasQuery) return [];
    return (issuesQuery.data ?? [])
      .filter((issue) => {
        const title = (issue.title || '').toLowerCase();
        const repo = issue.repositoryFullName.toLowerCase();
        return (
          title.includes(q) ||
          repo.includes(q) ||
          String(issue.issueNumber).includes(q) ||
          String(issue.id).includes(q)
        );
      })
      .slice(0, 12);
  }, [issuesQuery.data, q, hasQuery]);

  const isLoading =
    minersQuery.isLoading ||
    reposQuery.isLoading ||
    prsQuery.isLoading ||
    issuesQuery.isLoading;
  const isError =
    minersQuery.isError ||
    reposQuery.isError ||
    prsQuery.isError ||
    issuesQuery.isError;

  const totalResults =
    minerResults.length +
    repoResults.length +
    prResults.length +
    issueResults.length;

  const emptyLabelByTab: Record<typeof tabValue, string> = {
    miners: 'No miner matches.',
    repositories: 'No repository matches.',
    prs: 'No PR matches.',
    issues: 'No issue matches.',
  };

  return (
    <Page title="Search">
      <SEO
        title="Search"
        description="Search miners, repositories, pull requests, and issues in Gittensor."
      />
      <Box sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
        <Button
          variant="back"
          startIcon={<ArrowBackIcon sx={{ fontSize: '1rem !important' }} />}
          onClick={() => navigate('/dashboard')}
          sx={{ mb: 2, alignSelf: 'flex-start' }}
        >
          Back to Dashboard
        </Button>

        <Typography
          variant="h4"
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 600,
            color: '#fff',
            mt: 1,
            mb: 2,
          }}
        >
          Search
        </Typography>

        <GlobalSearchBar />

        {!hasQuery && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Type at least 2 characters to search.
          </Alert>
        )}

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {isError && !isLoading && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Failed to load one or more datasets required for search.
          </Alert>
        )}

        {hasQuery && !isLoading && !isError && (
          <Stack gap={2} sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {totalResults} result{totalResults === 1 ? '' : 's'} for "{query}"
            </Typography>

            <Box sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
              <Tabs
                value={tabValue}
                onChange={(_event, newValue) => setTabValue(newValue)}
                aria-label="search categories tabs"
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  '& .MuiTab-root': {
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    color: 'rgba(255, 255, 255, 0.5)',
                    minHeight: 48,
                    '&.Mui-selected': {
                      color: '#ffffff',
                    },
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#ffffff',
                    height: 2,
                  },
                }}
              >
                <Tab value="miners" label="Miners" />
                <Tab value="repositories" label="Repositories" />
                <Tab value="prs" label="Pull Requests" />
                <Tab value="issues" label="Issues" />
              </Tabs>
            </Box>

            {tabValue === 'miners' && (
              <Card elevation={0} sx={tableCardSx}>
                {minerResults.length === 0 ? (
                  <Box sx={{ p: 3 }}>
                    <Typography color="text.secondary">
                      {emptyLabelByTab.miners}
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={headerCellSx}>GitHub ID</TableCell>
                          <TableCell sx={headerCellSx}>Username</TableCell>
                          <TableCell sx={headerCellSx}>Hotkey</TableCell>
                          <TableCell sx={headerCellSx}>Tier</TableCell>
                          <TableCell sx={{ ...headerCellSx, textAlign: 'right' }}>
                            Score
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {minerResults.map((miner) => (
                          <TableRow
                            key={miner.githubId}
                            onClick={() =>
                              navigate(
                                `/miners/details?githubId=${encodeURIComponent(miner.githubId)}`,
                              )
                            }
                            sx={{
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                              },
                            }}
                          >
                            <TableCell sx={bodyCellSx}>{miner.githubId}</TableCell>
                            <TableCell sx={bodyCellSx}>
                              {miner.githubUsername || '-'}
                            </TableCell>
                            <TableCell sx={bodyCellSx}>{miner.hotkey || '-'}</TableCell>
                            <TableCell sx={bodyCellSx}>
                              {miner.currentTier || 'Unranked'}
                            </TableCell>
                            <TableCell sx={{ ...bodyCellSx, textAlign: 'right' }}>
                              {miner.totalScore.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Card>
            )}

            {tabValue === 'repositories' && (
              <Card elevation={0} sx={tableCardSx}>
                {repoResults.length === 0 ? (
                  <Box sx={{ p: 3 }}>
                    <Typography color="text.secondary">
                      {emptyLabelByTab.repositories}
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={headerCellSx}>Repository</TableCell>
                          <TableCell sx={headerCellSx}>Owner</TableCell>
                          <TableCell sx={headerCellSx}>Tier</TableCell>
                          <TableCell sx={{ ...headerCellSx, textAlign: 'right' }}>
                            Weight
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {repoResults.map((repo) => (
                          <TableRow
                            key={repo.fullName}
                            onClick={() =>
                              navigate(
                                `/miners/repository?name=${encodeURIComponent(repo.fullName)}`,
                              )
                            }
                            sx={{
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                              },
                            }}
                          >
                            <TableCell sx={bodyCellSx}>{repo.fullName}</TableCell>
                            <TableCell sx={bodyCellSx}>{repo.owner}</TableCell>
                            <TableCell sx={bodyCellSx}>{repo.tier || 'N/A'}</TableCell>
                            <TableCell sx={{ ...bodyCellSx, textAlign: 'right' }}>
                              {Number(repo.weight).toFixed(4)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Card>
            )}

            {tabValue === 'prs' && (
              <Card elevation={0} sx={tableCardSx}>
                {prResults.length === 0 ? (
                  <Box sx={{ p: 3 }}>
                    <Typography color="text.secondary">
                      {emptyLabelByTab.prs}
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={headerCellSx}>Repository</TableCell>
                          <TableCell sx={{ ...headerCellSx, width: 90 }}>PR</TableCell>
                          <TableCell sx={headerCellSx}>Title</TableCell>
                          <TableCell sx={headerCellSx}>Author</TableCell>
                          <TableCell sx={headerCellSx}>State</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {prResults.map((pr) => (
                          <TableRow
                            key={`${pr.repository}-${pr.pullRequestNumber}`}
                            onClick={() =>
                              navigate(
                                `/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`,
                              )
                            }
                            sx={{
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                              },
                            }}
                          >
                            <TableCell sx={bodyCellSx}>{pr.repository}</TableCell>
                            <TableCell sx={bodyCellSx}>#{pr.pullRequestNumber}</TableCell>
                            <TableCell sx={bodyCellSx}>
                              <Typography
                                sx={{
                                  fontFamily: '"JetBrains Mono", monospace',
                                  fontSize: '0.85rem',
                                  color: 'text.primary',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: { xs: 180, md: 500 },
                                }}
                              >
                                {pr.pullRequestTitle || 'Untitled pull request'}
                              </Typography>
                            </TableCell>
                            <TableCell sx={bodyCellSx}>{pr.author || '-'}</TableCell>
                            <TableCell sx={bodyCellSx}>{pr.prState || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Card>
            )}

            {tabValue === 'issues' && (
              <Card elevation={0} sx={tableCardSx}>
                {issueResults.length === 0 ? (
                  <Box sx={{ p: 3 }}>
                    <Typography color="text.secondary">
                      {emptyLabelByTab.issues}
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ ...headerCellSx, width: 90 }}>ID</TableCell>
                          <TableCell sx={headerCellSx}>Repository</TableCell>
                          <TableCell sx={headerCellSx}>Issue</TableCell>
                          <TableCell sx={headerCellSx}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {issueResults.map((issue) => (
                          <TableRow
                            key={issue.id}
                            onClick={() => navigate(`/issues/details?id=${issue.id}`)}
                            sx={{
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                              },
                            }}
                          >
                            <TableCell sx={bodyCellSx}>#{issue.id}</TableCell>
                            <TableCell sx={bodyCellSx}>
                              {issue.repositoryFullName}
                            </TableCell>
                            <TableCell sx={bodyCellSx}>
                              <Typography
                                sx={{
                                  fontFamily: '"JetBrains Mono", monospace',
                                  fontSize: '0.85rem',
                                  color: 'text.primary',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: { xs: 180, md: 480 },
                                }}
                              >
                                {issue.title || `Issue #${issue.issueNumber}`}
                              </Typography>
                            </TableCell>
                            <TableCell sx={bodyCellSx}>{issue.status}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Card>
            )}
          </Stack>
        )}
      </Box>
    </Page>
  );
};

export default SearchPage;

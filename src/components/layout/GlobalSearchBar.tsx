import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  ButtonBase,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAllMiners, useAllPrs, useReposAndWeights } from '../../api';

type SearchMiner = {
  githubId: string;
  githubUsername: string;
  hotkey: string;
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
    totalScore: toNumber(record.totalScore ?? record.total_score),
  };
};

const resultRowSx = {
  width: '100%',
  textAlign: 'left',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  p: 1.1,
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.06)',
  backgroundColor: 'rgba(255,255,255,0.01)',
  '&:hover': {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.14)',
  },
};

const GlobalSearchBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const minersQuery = useAllMiners();
  const reposQuery = useReposAndWeights();
  const prsQuery = useAllPrs();

  const hasQuery = query.trim().length >= 2;
  const q = query.trim().toLowerCase();

  const miners = useMemo(
    () =>
      ((minersQuery.data ?? []) as unknown[])
        .map(normalizeMiner)
        .filter((m): m is SearchMiner => Boolean(m)),
    [minersQuery.data],
  );

  const minerResults = useMemo(() => {
    if (!hasQuery) return [];
    return miners
      .filter((m) => {
        const username = m.githubUsername.toLowerCase();
        return (
          m.githubId.toLowerCase().includes(q) ||
          username.includes(q) ||
          m.hotkey.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 3);
  }, [miners, hasQuery, q]);

  const repoResults = useMemo(() => {
    if (!hasQuery) return [];
    return (reposQuery.data ?? [])
      .filter(
        (r) =>
          r.fullName.toLowerCase().includes(q) ||
          r.owner.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q),
      )
      .slice(0, 3);
  }, [reposQuery.data, hasQuery, q]);

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
      .slice(0, 3);
  }, [prsQuery.data, hasQuery, q]);

  useEffect(() => {
    if (location.pathname !== '/search') return;
    const qFromUrl = searchParams.get('q') || '';
    setQuery((prev) => (prev === qFromUrl ? prev : qFromUrl));
  }, [location.pathname, searchParams]);

  const handleOpenSearchPage = () => {
    const text = query.trim();
    if (!text) return;
    navigate(`/search?q=${encodeURIComponent(text)}`);
    setOpen(false);
  };

  const showDropdown =
    open && hasQuery;

  const clearQuery = () => {
    setQuery('');
    if (location.pathname === '/search') {
      const params = new URLSearchParams(searchParams);
      params.delete('q');
      setSearchParams(params, { replace: true });
    }
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 900 }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Search miners, repositories, PRs, issues..."
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 150);
        }}
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);

          // While on /search, keep results live-updating by URL query sync.
          if (location.pathname === '/search') {
            const params = new URLSearchParams(searchParams);
            if (value.trim()) {
              params.set('q', value);
            } else {
              params.delete('q');
            }
            setSearchParams(params, { replace: true });
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleOpenSearchPage();
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon
                sx={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '1rem' }}
              />
            </InputAdornment>
          ),
          endAdornment: query ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={clearQuery}
                edge="end"
                aria-label="clear search"
                sx={{ color: 'rgba(255,255,255,0.5)' }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            color: '#ffffff',
            fontFamily: '"JetBrains Mono", monospace',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            fontSize: '0.85rem',
            borderRadius: 2,
            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
            '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
            '&.Mui-focused fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.3)',
            },
          },
          '& .MuiInputBase-input::placeholder': {
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.8rem',
            opacity: 0.75,
          },
        }}
      />

      {showDropdown && (
        <Paper
          elevation={0}
          sx={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            zIndex: 1200,
            p: 1.2,
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px',
            backgroundColor: '#000000',
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03), rgba(255,255,255,0.03))',
            maxHeight: '360px',
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
            },
          }}
        >
          {(minersQuery.isLoading || reposQuery.isLoading || prsQuery.isLoading) && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={20} />
            </Box>
          )}

          {!minersQuery.isLoading && !reposQuery.isLoading && !prsQuery.isLoading && (
            <Stack spacing={0.5}>
              {minerResults.length > 0 && (
                <>
                  <Typography
                    sx={{
                      px: 0.5,
                      py: 0.25,
                      color: 'rgba(255,255,255,0.45)',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    Miners
                  </Typography>
                  {minerResults.map((miner) => (
                    <ButtonBase
                      key={`miner-${miner.githubId}`}
                      sx={resultRowSx}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        navigate(
                          `/miners/details?githubId=${encodeURIComponent(miner.githubId)}`,
                        );
                        setOpen(false);
                      }}
                    >
                      <Box>
                        <Typography sx={{ color: '#fff', fontSize: '0.92rem' }}>
                          {miner.githubUsername || miner.githubId}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'rgba(255,255,255,0.45)',
                            fontFamily: '"JetBrains Mono", monospace',
                          }}
                        >
                          Miner • {miner.githubId}
                        </Typography>
                      </Box>
                      <ArrowForwardIcon fontSize="small" />
                    </ButtonBase>
                  ))}
                </>
              )}

              {repoResults.length > 0 && (
                <>
                  <Typography
                    sx={{
                      px: 0.5,
                      pt: minerResults.length > 0 ? 0.75 : 0.25,
                      pb: 0.25,
                      color: 'rgba(255,255,255,0.45)',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    Repositories
                  </Typography>
                  {repoResults.map((repo) => (
                    <ButtonBase
                      key={`repo-${repo.fullName}`}
                      sx={resultRowSx}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        navigate(
                          `/miners/repository?name=${encodeURIComponent(repo.fullName)}`,
                        );
                        setOpen(false);
                      }}
                    >
                      <Box>
                        <Typography sx={{ color: '#fff', fontSize: '0.92rem' }}>
                          {repo.fullName}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'rgba(255,255,255,0.45)',
                            fontFamily: '"JetBrains Mono", monospace',
                          }}
                        >
                          Repository
                        </Typography>
                      </Box>
                      <ArrowForwardIcon fontSize="small" />
                    </ButtonBase>
                  ))}
                </>
              )}

              {prResults.length > 0 && (
                <>
                  <Typography
                    sx={{
                      px: 0.5,
                      pt:
                        minerResults.length > 0 || repoResults.length > 0
                          ? 0.75
                          : 0.25,
                      pb: 0.25,
                      color: 'rgba(255,255,255,0.45)',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    Pull Requests
                  </Typography>
                  {prResults.map((pr) => (
                    <ButtonBase
                      key={`pr-${pr.repository}-${pr.pullRequestNumber}`}
                      sx={resultRowSx}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        navigate(
                          `/miners/pr?repo=${encodeURIComponent(pr.repository)}&number=${pr.pullRequestNumber}`,
                        );
                        setOpen(false);
                      }}
                    >
                      <Box>
                        <Typography sx={{ color: '#fff', fontSize: '0.92rem' }}>
                          {pr.repository} #{pr.pullRequestNumber}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'rgba(255,255,255,0.45)',
                            fontFamily: '"JetBrains Mono", monospace',
                          }}
                        >
                          {pr.pullRequestTitle || 'Pull Request'}
                        </Typography>
                      </Box>
                      <ArrowForwardIcon fontSize="small" />
                    </ButtonBase>
                  ))}
                </>
              )}

              {minerResults.length === 0 &&
                repoResults.length === 0 &&
                prResults.length === 0 && (
                  <Box
                    sx={{
                      px: 1,
                      py: 2,
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      backgroundColor: 'rgba(255,255,255,0.01)',
                    }}
                  >
                    <Typography
                      sx={{
                        color: 'rgba(255,255,255,0.75)',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.82rem',
                      }}
                    >
                      No quick matches found.
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'rgba(255,255,255,0.45)',
                        fontFamily: '"JetBrains Mono", monospace',
                      }}
                    >
                      Press Enter to search all categories.
                    </Typography>
                  </Box>
                )}

                <ButtonBase
                  sx={resultRowSx}
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleOpenSearchPage}
              >
                <Typography
                  sx={{
                    color: 'primary.main',
                    fontSize: '0.9rem',
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  See all results for "{query.trim()}"
                </Typography>
                <ArrowForwardIcon fontSize="small" />
              </ButtonBase>
            </Stack>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default GlobalSearchBar;

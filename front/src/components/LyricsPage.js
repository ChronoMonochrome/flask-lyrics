// front/src/components/LyricsPage.js
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getSongList, getSongLyricsHtml } from '../services/api';

const LyricsPage = () => {
    const { t } = useTranslation();
    const [songs, setSongs] = useState([]);
    const [selectedSongId, setSelectedSongId] = useState(null);
    const [lyricsHtml, setLyricsHtml] = useState(null);
    const [loadingSongs, setLoadingSongs] = useState(true);
    const [loadingLyrics, setLoadingLyrics] = useState(false);
    const [error, setError] = useState(null);

    // Fetch song list on component mount
    useEffect(() => {
        const fetchSongs = async () => {
            setLoadingSongs(true);
            setError(null);
            try {
                const songList = await getSongList();
                setSongs(songList);
                if (songList.length > 0) {
                    setSelectedSongId(songList[0].id); // Select the first song by default
                }
            } catch (err) {
                setError(t('lyrics_fetch_list_error'));
            } finally {
                setLoadingSongs(false);
            }
        };
        fetchSongs();
    }, [t]);

    // Fetch lyrics HTML when selectedSongId changes
    useEffect(() => {
        const fetchLyrics = async () => {
            if (selectedSongId) {
                setLoadingLyrics(true);
                setError(null);
                setLyricsHtml(null); // Clear previous lyrics
                try {
                    const html = await getSongLyricsHtml(selectedSongId);
                    setLyricsHtml(html);
                } catch (err) {
                    setError(t('lyrics_fetch_html_error'));
                } finally {
                    setLoadingLyrics(false);
                }
            }
        };
        fetchLyrics();
    }, [selectedSongId, t]);

    const handleSongChange = (event) => {
        setSelectedSongId(event.target.value);
    };

    if (loadingSongs) {
        return <div>{t('loading_songs')}...</div>;
    }

    if (error) {
        return <div style={{ color: 'red' }}>{error}</div>;
    }

    return (
        <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
        <h2 className="text-3xl font-bold mb-6 text-center">{t('lyrics_page_title')}</h2>

        {songs.length > 0 && (
            <div className="mb-8 text-center">
            <label htmlFor="song-select" className="block text-xl font-medium text-gray-700 mb-2">
            {t('select_song')}:
            </label>
            <select
            id="song-select"
            value={selectedSongId || ''}
            onChange={handleSongChange}
            className="mt-1 block mx-auto w-full md:w-1/2 lg:w-1/3 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
            >
            {songs.map((song) => (
                <option key={song.id} value={song.id}>
                {song.title} - {song.artist}
                </option>
            ))}
            </select>
            </div>
        )}

        {loadingLyrics ? (
            <div>{t('loading_lyrics')}...</div>
        ) : lyricsHtml ? (
            // Dangerously set inner HTML as the backend provides full HTML content
            <div dangerouslySetInnerHTML={{ __html: lyricsHtml }} />
        ) : (
            <p>{t('lyrics_no_content')}</p>
        )}
        </div>
    );
};

export default LyricsPage;

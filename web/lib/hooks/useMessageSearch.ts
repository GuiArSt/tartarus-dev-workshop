import { useRef, useState, useCallback, useEffect } from "react";

export function useMessageSearch(messages: Array<{ id: string; parts?: any[] }>) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Search messages
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) {
        setSearchResults([]);
        setCurrentSearchIndex(0);
        return;
      }

      const lowerQuery = query.toLowerCase();
      const results: number[] = [];

      messages.forEach((message, index) => {
        const textParts =
          message.parts
            ?.filter((p: any) => p.type === "text")
            .map((p: any) => p.text)
            .join(" ") || "";

        if (textParts.toLowerCase().includes(lowerQuery)) {
          results.push(index);
        }
      });

      setSearchResults(results);
      setCurrentSearchIndex(0);

      if (results.length > 0) {
        scrollToSearchResult(results[0]);
      }
    },
    [messages]
  );

  // Scroll to a specific search result
  const scrollToSearchResult = useCallback(
    (messageIndex: number) => {
      const message = messages[messageIndex];
      if (message) {
        const element = messageRefs.current.get(message.id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    },
    [messages]
  );

  // Navigate search results
  const nextSearchResult = useCallback(() => {
    if (searchResults.length === 0) return;
    const newIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(newIndex);
    scrollToSearchResult(searchResults[newIndex]);
  }, [searchResults, currentSearchIndex, scrollToSearchResult]);

  const prevSearchResult = useCallback(() => {
    if (searchResults.length === 0) return;
    const newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(newIndex);
    scrollToSearchResult(searchResults[newIndex]);
  }, [searchResults, currentSearchIndex, scrollToSearchResult]);

  // Keyboard shortcut for search (Cmd/Ctrl + F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === "Escape" && showSearch) {
        setShowSearch(false);
        setSearchQuery("");
        setSearchResults([]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSearch]);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  return {
    showSearch,
    setShowSearch,
    searchQuery,
    searchResults,
    currentSearchIndex,
    messageRefs,
    handleSearch,
    nextSearchResult,
    prevSearchResult,
    closeSearch,
  };
}

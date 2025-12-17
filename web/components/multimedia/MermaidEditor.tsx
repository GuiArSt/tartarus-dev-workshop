"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Copy,
  Download,
  RefreshCw,
  Code,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCode,
  Palette,
  Check,
} from "lucide-react";
import mermaid from "mermaid";

interface MermaidEditorProps {
  initialCode?: string;
  onSave?: (code: string) => void;
  readOnly?: boolean;
}

const TEMPLATES = {
  flowchart: `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Do something]
    B -->|No| D[Do something else]
    C --> E[End]
    D --> E`,
  sequence: `sequenceDiagram
    participant A as User
    participant B as System
    A->>B: Request
    B-->>A: Response`,
  classDiagram: `classDiagram
    class Animal {
        +name: string
        +age: int
        +makeSound()
    }
    class Dog {
        +breed: string
        +bark()
    }
    Animal <|-- Dog`,
  erDiagram: `erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    USER {
        int id
        string name
        string email
    }
    ORDER {
        int id
        date created
    }`,
  stateDiagram: `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : start
    Processing --> Success : complete
    Processing --> Error : fail
    Success --> [*]
    Error --> Idle : retry`,
  gantt: `gantt
    title Project Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1
    Task 1     :a1, 2024-01-01, 30d
    Task 2     :after a1, 20d
    section Phase 2
    Task 3     :2024-02-15, 25d`,
};

const THEMES = [
  { value: "default", label: "Default" },
  { value: "dark", label: "Dark" },
  { value: "forest", label: "Forest" },
  { value: "neutral", label: "Neutral" },
];

export function MermaidEditor({ initialCode, onSave, readOnly = false }: MermaidEditorProps) {
  const [code, setCode] = useState(initialCode || TEMPLATES.flowchart);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [theme, setTheme] = useState("default");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("preview");

  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Stable renderDiagram function using useCallback
  const renderDiagram = useCallback(async () => {
    if (!previewRef.current || activeTab !== "preview") return;

    try {
      setError(null);
      previewRef.current.innerHTML = "";

      // Generate unique ID to avoid conflicts
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const { svg } = await mermaid.render(id, code);
      previewRef.current.innerHTML = svg;

      // Apply zoom
      const svgElement = previewRef.current.querySelector("svg");
      if (svgElement) {
        svgElement.style.transform = `scale(${zoom / 100})`;
        svgElement.style.transformOrigin = "center center";
      }
    } catch (err: any) {
      setError(err.message || "Invalid diagram syntax");
    }
  }, [code, zoom, activeTab]);

  // Initialize mermaid with theme
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme as any,
      securityLevel: "loose",
    });
    if (activeTab === "preview") {
      renderDiagram();
    }
  }, [theme, renderDiagram, activeTab]);

  // Re-render when code, zoom, or tab changes to preview
  useEffect(() => {
    if (activeTab === "preview") {
      const timeout = setTimeout(() => {
        renderDiagram();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [code, zoom, activeTab, renderDiagram]);


  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSVG = () => {
    if (!previewRef.current) return;
    const svg = previewRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPNG = async () => {
    if (!previewRef.current) return;
    const svg = previewRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx?.scale(2, 2);
      ctx?.drawImage(img, 0, 0);

      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = "diagram.png";
      a.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const loadTemplate = (template: keyof typeof TEMPLATES) => {
    setCode(TEMPLATES[template]);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 200));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 25));
  const handleZoomReset = () => setZoom(100);

  return (
    <Card className="flex flex-col h-full">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 p-3 border-b flex-wrap">
          <div className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-primary" />
            <span className="font-medium">Mermaid Diagram</span>
            {error && <Badge variant="destructive">Error</Badge>}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-muted rounded-md p-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs w-12 text-center">{zoom}%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomReset} title="Reset zoom">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Theme Selector */}
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-[120px] h-8">
                <Palette className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THEMES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Actions */}
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 mr-1 text-green-500" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadSVG}>
              <Download className="h-4 w-4 mr-1" />
              SVG
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPNG}>
              <Download className="h-4 w-4 mr-1" />
              PNG
            </Button>
            {onSave && (
              <Button size="sm" onClick={() => onSave(code)}>
                Save
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="border-b px-3">
            <TabsList className="h-10">
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
              {!readOnly && (
                <TabsTrigger value="code" className="gap-2">
                  <Code className="h-4 w-4" />
                  Code
                </TabsTrigger>
              )}
              {!readOnly && (
                <TabsTrigger value="templates" className="gap-2">
                  <FileCode className="h-4 w-4" />
                  Templates
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Preview Tab - Main Focus */}
          <TabsContent value="preview" className="flex-1 m-0 p-0 overflow-hidden">
            <div
              ref={containerRef}
              className="h-full w-full overflow-auto bg-white dark:bg-slate-950 flex items-center justify-center min-h-[400px]"
            >
              {error ? (
                <div className="text-center p-8">
                  <Badge variant="destructive" className="mb-2">Syntax Error</Badge>
                  <p className="text-sm text-muted-foreground max-w-md">{error}</p>
                </div>
              ) : (
                <div
                  ref={previewRef}
                  className="p-8 transition-transform duration-200"
                  style={{ minWidth: "100%", minHeight: "100%" }}
                />
              )}
            </div>
          </TabsContent>

          {/* Code Tab */}
          {!readOnly && (
            <TabsContent value="code" className="flex-1 m-0 p-4">
              <div className="h-full flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Edit the Mermaid code below</span>
                  <Button variant="ghost" size="sm" onClick={renderDiagram}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh Preview
                  </Button>
                </div>
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1 font-mono text-sm min-h-[300px] resize-none"
                  placeholder="Enter Mermaid diagram code..."
                />
              </div>
            </TabsContent>
          )}

          {/* Templates Tab */}
          {!readOnly && (
            <TabsContent value="templates" className="flex-1 m-0 p-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(TEMPLATES).map(([key, value]) => (
                  <Card
                    key={key}
                    className="cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                    onClick={() => {
                      loadTemplate(key as keyof typeof TEMPLATES);
                      setActiveTab("preview");
                    }}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-medium capitalize mb-2">{key.replace(/([A-Z])/g, " $1").trim()}</h3>
                      <pre className="text-xs text-muted-foreground bg-muted p-2 rounded overflow-hidden max-h-24">
                        {value.substring(0, 100)}...
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Zoom Slider (Bottom) */}
        <div className="p-3 border-t flex items-center gap-4">
          <ZoomOut className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[zoom]}
            onValueChange={(v) => setZoom(v[0])}
            min={25}
            max={200}
            step={5}
            className="flex-1 max-w-xs"
          />
          <ZoomIn className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground w-12">{zoom}%</span>
        </div>
      </CardContent>
    </Card>
  );
}

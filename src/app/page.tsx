"use client"

import type React from "react"
import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import {
  Upload,
  Search,
  Filter,
  MessageSquare,
  Users,
  Phone,
  MoreVertical,
  FileText,
  AlertCircle,
  X,
  ArrowLeft,
  Download,
  Settings,
  Eye,
  Calendar,
  Clock,
  Hash,
  Mail,
  User,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface ChatMessage {
  author_user_email?: string
  author_user_id?: string
  author_user_name?: string
  message?: string
  room_id?: string
  room_members?: Array<{
    room_member_id: string
    room_member_name: string
  }>
  room_name?: string
  room_type?: "direct" | "sms" | "group" | string
  ts?: number
  ts_iso?: string
  [key: string]: any // Allow any additional fields
}

interface AppSettings {
  darkMode: boolean
  compactView: boolean
  showTimestamps: boolean
  showEmails: boolean
  autoRefresh: boolean
  itemsPerPage: number
}

// Virtual scrolling hook with improved performance
function useVirtualScrolling(items: any[], itemHeight: number, containerHeight: number, buffer = 5) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleStart = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer)
  const visibleEnd = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer)

  const visibleItems = items.slice(visibleStart, visibleEnd).map((item, index) => ({
    ...item,
    index: visibleStart + index,
  }))

  const totalHeight = items.length * itemHeight
  const offsetY = visibleStart * itemHeight

  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop,
    visibleStart,
    visibleEnd,
  }
}

// Debounced search hook
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function ChatFilterApp() {
  const [chatData, setChatData] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>("")
  const [dateFilter, setDateFilter] = useState<string>("")
  const [activeTab, setActiveTab] = useState("all")
  const [selectedConversation, setSelectedConversation] = useState<ChatMessage | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [jsonPreview, setJsonPreview] = useState<string>("")
  const [isMobile, setIsMobile] = useState(false)
  const [settings, setSettings] = useState<AppSettings>({
    darkMode: false,
    compactView: false,
    showTimestamps: true,
    showEmails: true,
    autoRefresh: false,
    itemsPerPage: 50,
  })

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const conversationScrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Check if mobile and load settings
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)

    // Load settings from localStorage
    const savedSettings = localStorage.getItem("chatFilterSettings")
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }

    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem("chatFilterSettings", JSON.stringify(settings))
  }, [settings])

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith(".json")) {
      setError("Please select a valid JSON file")
      return
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError("File size must be less than 100MB")
      return
    }

    setIsLoading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Realistic progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev < 30) return prev + Math.random() * 10
          if (prev < 60) return prev + Math.random() * 5
          if (prev < 90) return prev + Math.random() * 2
          return prev
        })
      }, 150)

      const text = await file.text()
      const data = JSON.parse(text)

      clearInterval(progressInterval)
      setUploadProgress(95)

      // Validate data structure
      if (!Array.isArray(data)) {
        throw new Error("JSON file must contain an array of messages")
      }

      if (data.length === 0) {
        throw new Error("JSON file appears to be empty")
      }

      // Auto-detect structure and provide preview
      const sampleItem = data[0]
      const detectedFields = Object.keys(sampleItem)

      setJsonPreview(JSON.stringify(sampleItem, null, 2))

      console.log("Detected fields:", detectedFields)
      console.log("Sample data:", sampleItem)

      // Flexible validation - just check if it's an array of objects
      const validItems = data.filter((item) => typeof item === "object" && item !== null)

      if (validItems.length < data.length * 0.5) {
        throw new Error(`Only ${validItems.length} out of ${data.length} items appear to be valid objects`)
      }

      setUploadProgress(100)

      // Add smooth transition
      setTimeout(() => {
        setChatData(data)
        setUploadProgress(0)
      }, 300)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error parsing JSON file")
      setUploadProgress(0)
    } finally {
      setTimeout(() => setIsLoading(false), 300)
    }
  }, [])

  const filteredMessages = useMemo(() => {
    let filtered = [...chatData]

    // Apply tab filter
    if (activeTab === "senders") {
      const senderMap = new Map<string, ChatMessage>()
      chatData.forEach((item) => {
        const senderId = item.author_user_id || item.author_user_name || "unknown"
        const timestamp = item.ts_iso || item.timestamp || new Date().toISOString()
        if (!senderMap.has(senderId) || new Date(timestamp) > new Date(senderMap.get(senderId)?.ts_iso || 0)) {
          senderMap.set(senderId, item)
        }
      })
      filtered = Array.from(senderMap.values())
    } else if (activeTab === "rooms") {
      const roomMap = new Map<string, ChatMessage>()
      chatData.forEach((item) => {
        const roomId = item.room_id || item.room_name || "unknown"
        const timestamp = item.ts_iso || item.timestamp || new Date().toISOString()
        if (!roomMap.has(roomId) || new Date(timestamp) > new Date(roomMap.get(roomId)?.ts_iso || 0)) {
          roomMap.set(roomId, item)
        }
      })
      filtered = Array.from(roomMap.values())
    }

    // Apply search filter with debouncing
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase()
      filtered = filtered.filter((item) => {
        const searchableText = [
          item.message,
          item.author_user_name,
          item.room_name,
          item.author_user_email,
          item.room_type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return searchableText.includes(term)
      })
    }

    // Apply room type filter
    if (roomTypeFilter && roomTypeFilter !== "all") {
      filtered = filtered.filter((item) => item.room_type === roomTypeFilter)
    }

    // Apply date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter)
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.ts_iso || item.timestamp || 0)
        return itemDate.toDateString() === filterDate.toDateString()
      })
    }

    // Sort by timestamp (newest first)
    return filtered.sort((a, b) => {
      const aTime = new Date(a.ts_iso || a.timestamp || 0).getTime()
      const bTime = new Date(b.ts_iso || b.timestamp || 0).getTime()
      return bTime - aTime
    })
  }, [chatData, activeTab, debouncedSearchTerm, roomTypeFilter, dateFilter])

  const stats = useMemo(() => {
    const senders = new Set(chatData.map((item) => item.author_user_id || item.author_user_name).filter(Boolean))
    const rooms = new Set(chatData.map((item) => item.room_id || item.room_name).filter(Boolean))
    const roomTypes = new Set(chatData.map((item) => item.room_type).filter(Boolean))

    return {
      totalMessages: chatData.length,
      totalSenders: senders.size,
      totalRooms: rooms.size,
      roomTypes: Array.from(roomTypes),
      filteredCount: filteredMessages.length,
    }
  }, [chatData, filteredMessages])

  // Virtual scrolling setup with dynamic height
  const containerHeight = isMobile ? 500 : 600
  const itemHeight = settings.compactView ? 60 : 80
  const { visibleItems, totalHeight, offsetY, setScrollTop } = useVirtualScrolling(
    filteredMessages,
    itemHeight,
    containerHeight,
  )

  const getIconForRoomType = (roomType: string) => {
    switch (roomType?.toLowerCase()) {
      case "direct":
        return "👤"
      case "sms":
        return "📱"
      case "group":
        return "👥"
      default:
        return "💬"
    }
  }

  const getColorForRoomType = (roomType: string) => {
    switch (roomType?.toLowerCase()) {
      case "direct":
        return "bg-green-500"
      case "sms":
        return "bg-red-500"
      case "group":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  const cleanRoomName = (roomName: string) => {
    if (!roomName) return "Unknown Room"
    return roomName
      .replace(/^Direct \[/, "")
      .replace(/^LEGACY_SMS \[/, "")
      .replace(/\] \[.*\]$/, "")
      .replace(/\[|\]/g, "")
      .trim()
  }

  const formatTime = (isoString: string) => {
    if (!isoString) return ""
    try {
      return new Date(isoString).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    } catch {
      return ""
    }
  }

  const formatDate = (isoString: string) => {
    if (!isoString) return ""
    try {
      const date = new Date(isoString)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      if (date.toDateString() === today.toDateString()) {
        return "Today"
      } else if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday"
      } else {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
        })
      }
    } catch {
      return ""
    }
  }

  const openConversation = useCallback((message: ChatMessage) => {
    setSelectedConversation(message)
    setIsModalOpen(true)
    setTimeout(() => {
      if (conversationScrollRef.current) {
        conversationScrollRef.current.scrollTop = conversationScrollRef.current.scrollHeight
      }
    }, 100)
  }, [])

  const conversationMessages = useMemo(() => {
    if (!selectedConversation) return []
    const senderId = selectedConversation.author_user_id || selectedConversation.author_user_name
    return chatData
      .filter((msg) => (msg.author_user_id || msg.author_user_name) === senderId)
      .sort((a, b) => {
        const aTime = new Date(a.ts_iso || a.timestamp || 0).getTime()
        const bTime = new Date(b.ts_iso || b.timestamp || 0).getTime()
        return aTime - bTime
      })
  }, [chatData, selectedConversation])

  const resetApp = useCallback(() => {
    setChatData([])
    setSearchTerm("")
    setRoomTypeFilter("")
    setDateFilter("")
    setActiveTab("all")
    setError(null)
    setSelectedConversation(null)
    setIsModalOpen(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  const clearSearch = useCallback(() => {
    setSearchTerm("")
  }, [])

  const exportData = useCallback(() => {
    const dataToExport = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalMessages: stats.totalMessages,
        filteredMessages: stats.filteredCount,
        filters: {
          search: debouncedSearchTerm,
          roomType: roomTypeFilter,
          date: dateFilter,
          tab: activeTab,
        },
      },
      messages: filteredMessages,
    }

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `chat-export-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [filteredMessages, stats, debouncedSearchTerm, roomTypeFilter, dateFilter, activeTab])

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop)
    },
    [setScrollTop],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const files = Array.from(e.dataTransfer.files)
      const jsonFile = files.find((file) => file.name.toLowerCase().endsWith(".json"))

      if (jsonFile && fileInputRef.current) {
        const dt = new DataTransfer()
        dt.items.add(jsonFile)
        fileInputRef.current.files = dt.files
        handleFileUpload({ target: { files: dt.files } } as any)
      }
    },
    [handleFileUpload],
  )

  if (chatData.length === 0 && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <div className="mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <FileText className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Chat Data Analyzer</h2>
              <p className="text-gray-600 mb-8 text-lg">Upload your chat JSON file to explore and analyze messages</p>
            </div>

            {error && (
              <Alert className="mb-6" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-6">
              <div
                className="border-2 border-dashed border-gray-300 rounded-2xl p-10 hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300 cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.JSON,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={isLoading}
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                  <Upload className="w-12 h-12 text-gray-400 mb-4" />
                  <span className="text-lg font-medium text-gray-700 mb-2">
                    {isLoading ? "Processing..." : "Choose JSON File or Drag & Drop"}
                  </span>
                  <span className="text-sm text-gray-500">Supports files up to 100MB</span>
                </label>
              </div>

              {isLoading && (
                <div className="space-y-4">
                  <Progress value={uploadProgress} className="w-full h-3" />
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-3/4 mx-auto" />
                    <Skeleton className="h-4 w-1/2 mx-auto" />
                  </div>
                </div>
              )}

              {jsonPreview && (
                <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview JSON Structure
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>JSON Structure Preview</DialogTitle>
                    </DialogHeader>
                    <Textarea value={jsonPreview} readOnly className="h-96 font-mono text-sm" />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${settings.darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <div
        className={`max-w-6xl mx-auto min-h-screen shadow-lg transition-colors duration-300 ${settings.darkMode ? "bg-gray-800 text-white" : "bg-white"}`}
      >
        {/* Enhanced Header */}
        <div
          className={`border-b p-4 sticky top-0 z-20 backdrop-blur-sm transition-colors duration-300 ${settings.darkMode ? "border-gray-700 bg-gray-800/90" : "border-gray-200 bg-white/90"}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">Chat Analyzer</h1>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {stats.totalMessages.toLocaleString()} messages
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="dark-mode">Dark Mode</Label>
                      <Switch
                        id="dark-mode"
                        checked={settings.darkMode}
                        onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, darkMode: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="compact-view">Compact View</Label>
                      <Switch
                        id="compact-view"
                        checked={settings.compactView}
                        onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, compactView: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-timestamps">Show Timestamps</Label>
                      <Switch
                        id="show-timestamps"
                        checked={settings.showTimestamps}
                        onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, showTimestamps: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-emails">Show Emails</Label>
                      <Switch
                        id="show-emails"
                        checked={settings.showEmails}
                        onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, showEmails: checked }))}
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={exportData} size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>

              <Button variant="outline" onClick={resetApp} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                {isMobile ? "Reset" : "New File"}
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Bar */}
        <div
          className={`p-4 border-b transition-colors duration-300 ${settings.darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"}`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className={`p-3 ${settings.darkMode ? "bg-gray-700 border-gray-600" : ""}`}>
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-xs text-gray-500">Messages</p>
                  <p className="font-semibold">{stats.totalMessages.toLocaleString()}</p>
                </div>
              </div>
            </Card>
            <Card className={`p-3 ${settings.darkMode ? "bg-gray-700 border-gray-600" : ""}`}>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-xs text-gray-500">Senders</p>
                  <p className="font-semibold">{stats.totalSenders}</p>
                </div>
              </div>
            </Card>
            <Card className={`p-3 ${settings.darkMode ? "bg-gray-700 border-gray-600" : ""}`}>
              <div className="flex items-center space-x-2">
                <Hash className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-xs text-gray-500">Rooms</p>
                  <p className="font-semibold">{stats.totalRooms}</p>
                </div>
              </div>
            </Card>
            <Card className={`p-3 ${settings.darkMode ? "bg-gray-700 border-gray-600" : ""}`}>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-purple-500" />
                <div>
                  <p className="text-xs text-gray-500">Filtered</p>
                  <p className="font-semibold">{stats.filteredCount.toLocaleString()}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div
            className={`sticky top-20 z-10 transition-colors duration-300 ${settings.darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-b`}
          >
            <TabsList className="w-full justify-start rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger
                value="all"
                className={`rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 transition-all duration-200 ${settings.darkMode ? "data-[state=active]:bg-gray-700" : "data-[state=active]:bg-blue-50/50"}`}
              >
                All Messages
              </TabsTrigger>
              <TabsTrigger
                value="senders"
                className={`rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 transition-all duration-200 ${settings.darkMode ? "data-[state=active]:bg-gray-700" : "data-[state=active]:bg-blue-50/50"}`}
              >
                <Users className="w-4 h-4 mr-2" />
                Senders
                <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-800">
                  {stats.totalSenders}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="rooms"
                className={`rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 transition-all duration-200 ${settings.darkMode ? "data-[state=active]:bg-gray-700" : "data-[state=active]:bg-blue-50/50"}`}
              >
                <Hash className="w-4 h-4 mr-2" />
                Rooms
                <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800">
                  {stats.totalRooms}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Enhanced Search and Filters */}
            <div className={`p-4 transition-colors duration-300 ${settings.darkMode ? "bg-gray-800" : "bg-gray-50"}`}>
              <div className="flex gap-3 flex-col lg:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search messages, users, or rooms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`pl-10 pr-10 transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${settings.darkMode ? "bg-gray-700 border-gray-600" : ""}`}
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSearch}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-200"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
                  <SelectTrigger
                    className={`w-full lg:w-48 transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${settings.darkMode ? "bg-gray-700 border-gray-600" : ""}`}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="All Room Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Room Types</SelectItem>
                    {stats.roomTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className={`pl-10 w-full lg:w-48 transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${settings.darkMode ? "bg-gray-700 border-gray-600" : ""}`}
                  />
                </div>
              </div>
            </div>
          </div>

          <TabsContent value={activeTab} className="m-0">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-20">
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${settings.darkMode ? "bg-gray-700" : "bg-gray-100"}`}
                >
                  <MessageSquare className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium mb-3">No messages found</h3>
                <p className="text-gray-500 mb-6">Try adjusting your search or filter criteria</p>
                {(searchTerm || roomTypeFilter || dateFilter) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("")
                      setRoomTypeFilter("")
                      setDateFilter("")
                    }}
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            ) : (
              <div
                className="relative overflow-auto scroll-smooth"
                style={{ height: `${containerHeight}px` }}
                onScroll={handleScroll}
                ref={scrollContainerRef}
              >
                <div style={{ height: `${totalHeight}px` }}>
                  <div
                    style={{
                      transform: `translateY(${offsetY}px)`,
                      transition: "transform 0.05s ease-out",
                    }}
                  >
                    {visibleItems.map((message) => (
                      <div
                        key={`${message.author_user_id || message.author_user_name}-${message.index}`}
                        className={`p-4 cursor-pointer transition-all duration-200 border-b active:scale-[0.99] ${
                          settings.darkMode
                            ? "hover:bg-gray-700 border-gray-700 active:bg-gray-600"
                            : "hover:bg-blue-50/50 border-gray-100 active:bg-blue-100/50"
                        }`}
                        style={{ height: `${itemHeight}px` }}
                        onClick={() => openConversation(message)}
                      >
                        <div className="flex items-center space-x-3 h-full">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shadow-lg">
                            {(message.author_user_name || "U")
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .substring(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="text-sm font-semibold truncate">
                                {message.author_user_name || "Unknown User"}
                              </h3>
                              {settings.showTimestamps && (
                                <span className="text-xs text-gray-500 whitespace-nowrap ml-2 flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatTime(message.ts_iso || message.timestamp || "")}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 truncate">
                              <span className="font-medium text-blue-600">
                                {cleanRoomName(message.room_name || "")}:
                              </span>{" "}
                              {message.message || "No message content"}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              {settings.showEmails && message.author_user_email && (
                                <span className="text-xs text-gray-400 flex items-center">
                                  <Mail className="w-3 h-3 mr-1" />
                                  {message.author_user_email}
                                </span>
                              )}
                              <span className="text-xs text-gray-400">
                                {formatDate(message.ts_iso || message.timestamp || "")}
                              </span>
                              {message.room_type && (
                                <Badge variant="outline" className="text-xs">
                                  {getIconForRoomType(message.room_type)} {message.room_type}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Enhanced Conversation Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent
            className={`${isMobile ? "max-w-full h-full m-0 rounded-none" : "max-w-3xl h-[90vh]"} flex flex-col p-0 ${settings.darkMode ? "bg-gray-800 border-gray-700" : ""}`}
          >
            {selectedConversation && (
              <>
                <DialogHeader
                  className={`p-4 border-b sticky top-0 z-10 backdrop-blur-sm transition-colors duration-300 ${settings.darkMode ? "border-gray-700 bg-gray-800/90" : "border-gray-200 bg-white/90"}`}
                >
                  <div className="flex items-center space-x-3">
                    {isMobile && (
                      <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)} className="p-2">
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                    )}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg">
                      {(selectedConversation.author_user_name || "U")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-lg font-semibold truncate">
                        {selectedConversation.author_user_name || "Unknown User"}
                      </DialogTitle>
                      <p className="text-sm text-gray-500 flex items-center">
                        <Mail className="w-3 h-3 mr-1" />
                        {selectedConversation.author_user_email || "No email"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{conversationMessages.length} messages</Badge>
                      {!isMobile && (
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Phone className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </DialogHeader>

                <div
                  className={`flex-1 p-4 overflow-y-auto scroll-smooth transition-colors duration-300 ${settings.darkMode ? "bg-gray-900" : "bg-gray-50"}`}
                  ref={conversationScrollRef}
                  style={{ scrollBehavior: "smooth" }}
                >
                  <div className="space-y-4">
                    {conversationMessages.map((msg, index) => {
                      const showDateSeparator =
                        index === 0 ||
                        formatDate(msg.ts_iso || msg.timestamp || "") !==
                          formatDate(
                            conversationMessages[index - 1].ts_iso || conversationMessages[index - 1].timestamp || "",
                          )

                      const isOwnMessage = index % 2 === 1 // Simplified logic for demo

                      return (
                        <div key={index} className="animate-in fade-in duration-300">
                          {showDateSeparator && (
                            <div className="text-center my-6">
                              <span
                                className={`px-4 py-2 rounded-full text-xs border shadow-sm transition-colors duration-300 ${settings.darkMode ? "bg-gray-800 text-gray-300 border-gray-600" : "bg-white text-gray-500 border-gray-200"}`}
                              >
                                {formatDate(msg.ts_iso || msg.timestamp || "")}
                              </span>
                            </div>
                          )}

                          <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md ${
                                isOwnMessage
                                  ? "bg-blue-500 text-white rounded-br-md"
                                  : settings.darkMode
                                    ? "bg-gray-700 text-gray-100 rounded-bl-md border border-gray-600"
                                    : "bg-white text-gray-900 rounded-bl-md border"
                              }`}
                            >
                              {!isOwnMessage && (
                                <div className="mb-2">
                                  <p className="text-xs font-semibold text-blue-600 flex items-center">
                                    <User className="w-3 h-3 mr-1" />
                                    {msg.author_user_name || "Unknown"}
                                  </p>
                                  <p className={`text-xs ${settings.darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                    {cleanRoomName(msg.room_name || "")}
                                  </p>
                                </div>
                              )}
                              <p className="text-sm leading-relaxed break-words">
                                {msg.message || "No message content"}
                              </p>
                              <p
                                className={`text-xs mt-2 flex items-center ${isOwnMessage ? "text-blue-100" : settings.darkMode ? "text-gray-400" : "text-gray-500"}`}
                              >
                                <Clock className="w-3 h-3 mr-1" />
                                {formatTime(msg.ts_iso || msg.timestamp || "")}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

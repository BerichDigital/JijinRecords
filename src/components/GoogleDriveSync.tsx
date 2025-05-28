'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Cloud, CloudOff, Settings, Upload, Download, User, RefreshCw } from 'lucide-react'
import { googleDriveSync, type GoogleDriveConfig, type FundData } from '@/lib/google-drive-sync'
import { useFundStore } from '@/store/fund'

export function GoogleDriveSync() {
  const [isConfigured, setIsConfigured] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showConfig, setShowConfig] = useState(false)
  
  // API 配置状态
  const [clientId, setClientId] = useState('')
  const [apiKey, setApiKey] = useState('')
  
  // 从 zustand store 获取数据
  const { transactions, holdings, accountSummary, fundPrices, importData } = useFundStore()

  useEffect(() => {
    // 检查是否已配置
    const savedConfig = localStorage.getItem('google-drive-config')
    if (savedConfig) {
      const config = JSON.parse(savedConfig)
      setClientId(config.clientId)
      setApiKey(config.apiKey)
      setIsConfigured(true)
      
      // 初始化 Google API
      initializeAPI()
    }
  }, [])

  const initializeAPI = async () => {
    try {
      setIsLoading(true)
      const success = await googleDriveSync.initializeGoogleAPI()
      if (success) {
        const signedIn = googleDriveSync.isSignedIn()
        setIsSignedIn(signedIn)
        
        if (signedIn) {
          const user = await googleDriveSync.getCurrentUser()
          setCurrentUser(user)
        }
      }
    } catch (error) {
      console.error('初始化失败:', error)
      toast.error('Google Drive API 初始化失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveConfig = async () => {
    if (!clientId.trim() || !apiKey.trim()) {
      toast.error('请填写完整的 API 配置信息')
      return
    }

    const config: GoogleDriveConfig = {
      clientId: clientId.trim(),
      apiKey: apiKey.trim()
    }

    googleDriveSync.setConfig(config)
    setIsConfigured(true)
    setShowConfig(false)
    toast.success('配置已保存')
    
    // 初始化 API
    await initializeAPI()
  }

  const handleSignIn = async () => {
    try {
      setIsLoading(true)
      const success = await googleDriveSync.signIn()
      if (success) {
        setIsSignedIn(true)
        const user = await googleDriveSync.getCurrentUser()
        setCurrentUser(user)
        toast.success('登录成功！')
      } else {
        toast.error('登录失败，请重试')
      }
    } catch (error) {
      console.error('登录失败:', error)
      toast.error('登录失败，请检查网络连接')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await googleDriveSync.signOut()
      setIsSignedIn(false)
      setCurrentUser(null)
      toast.success('已退出登录')
    } catch (error) {
      console.error('退出登录失败:', error)
      toast.error('退出登录失败')
    }
  }

  const handleUpload = async () => {
    try {
      setIsLoading(true)
      const data: FundData = {
        transactions,
        holdings,
        accountSummary,
        fundPrices
      }
      
      const success = await googleDriveSync.uploadData(data)
      if (success) {
        toast.success('数据已成功上传到 Google Drive！')
      } else {
        toast.error('上传失败，请重试')
      }
    } catch (error) {
      console.error('上传失败:', error)
      toast.error('上传失败，请检查网络连接')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      setIsLoading(true)
      const data = await googleDriveSync.downloadData()
      
      if (data) {
        // 使用 zustand store 的 importData 方法导入数据
        importData(data)
        toast.success('数据已从 Google Drive 下载并同步！')
      } else {
        toast.info('Google Drive 中没有找到数据文件')
      }
    } catch (error) {
      console.error('下载失败:', error)
      toast.error('下载失败，请检查网络连接')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isSignedIn ? (
            <Cloud className="h-5 w-5 text-green-500" />
          ) : (
            <CloudOff className="h-5 w-5 text-gray-400" />
          )}
          Google Drive 数据同步
        </CardTitle>
        <CardDescription>
          将你的基金记录数据同步到 Google Drive，在不同设备间保持数据一致
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 配置状态 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">配置状态:</span>
            <Badge variant={isConfigured ? "default" : "secondary"}>
              {isConfigured ? "已配置" : "未配置"}
            </Badge>
          </div>
          
          <Dialog open={showConfig} onOpenChange={setShowConfig}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                配置 API
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Google Drive API 配置</DialogTitle>
                <DialogDescription>
                  请输入你的 Google Drive API 凭据。如果你还没有，请访问 Google Cloud Console 创建。
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="你的 Google OAuth Client ID"
                  />
                </div>
                
                <div>
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="你的 Google Drive API Key"
                  />
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg text-sm">
                  <p className="font-medium text-blue-800 mb-1">获取 API 凭据:</p>
                  <p className="text-blue-700">
                    1. 访问 Google Cloud Console<br/>
                    2. 创建新项目或选择现有项目<br/>
                    3. 启用 Google Drive API<br/>
                    4. 创建 OAuth 2.0 客户端 ID 和 API 密钥
                  </p>
                </div>
                
                <Button onClick={handleSaveConfig} className="w-full">
                  保存配置
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Separator />

        {/* 登录状态 */}
        {isConfigured && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">登录状态:</span>
                <Badge variant={isSignedIn ? "default" : "secondary"}>
                  {isSignedIn ? "已登录" : "未登录"}
                </Badge>
              </div>
              
              {isSignedIn ? (
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  退出登录
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  onClick={handleSignIn}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <User className="h-4 w-4 mr-2" />
                  )}
                  登录 Google
                </Button>
              )}
            </div>

            {/* 用户信息 */}
            {currentUser && (
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  {currentUser.imageUrl && (
                    <img 
                      src={currentUser.imageUrl} 
                      alt="用户头像" 
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium text-green-800">{currentUser.name}</p>
                    <p className="text-sm text-green-600">{currentUser.email}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* 同步操作 */}
        {isSignedIn && (
          <div className="space-y-3">
            <h4 className="font-medium">数据同步操作</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={handleUpload}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                上传数据
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleDownload}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                下载数据
              </Button>
            </div>
            
            <div className="bg-yellow-50 p-3 rounded-lg text-sm">
              <p className="text-yellow-800">
                <strong>提示:</strong> 上传会将当前数据保存到 Google Drive，下载会从 Google Drive 获取最新数据并覆盖本地数据。
              </p>
            </div>
          </div>
        )}

        {/* 未配置提示 */}
        {!isConfigured && (
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <p className="text-gray-600 mb-3">
              请先配置 Google Drive API 以开始使用数据同步功能
            </p>
            <Button onClick={() => setShowConfig(true)}>
              <Settings className="h-4 w-4 mr-2" />
              开始配置
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 
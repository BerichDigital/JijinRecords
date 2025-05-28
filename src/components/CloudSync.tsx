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
import { Cloud, CloudOff, Settings, Upload, Download, RefreshCw, Trash2, Info } from 'lucide-react'
import { cloudSync, type CloudSyncConfig, type FundData } from '@/lib/cloud-sync'
import { useFundStore } from '@/store/fund'

export function CloudSync() {
  const [isConfigured, setIsConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [cloudInfo, setCloudInfo] = useState<any>(null)
  
  // API 配置状态
  const [apiKey, setApiKey] = useState('')
  
  // 从 zustand store 获取数据
  const { transactions, holdings, accountSummary, fundPrices, importData } = useFundStore()

  useEffect(() => {
    // 检查是否已配置
    const status = cloudSync.getConfigStatus()
    setIsConfigured(status.isConfigured)
    
    if (status.isConfigured) {
      loadCloudInfo()
    }
  }, [])

  const loadCloudInfo = async () => {
    try {
      const info = await cloudSync.getCloudDataInfo()
      setCloudInfo(info)
    } catch (error) {
      console.error('加载云端信息失败:', error)
    }
  }

  const handleSaveConfig = async () => {
    if (!apiKey.trim()) {
      toast.error('请填写 API 密钥')
      return
    }

    const config: CloudSyncConfig = {
      apiKey: apiKey.trim()
    }

    cloudSync.setConfig(config)
    setIsConfigured(true)
    setShowConfig(false)
    toast.success('配置已保存！现在可以开始同步数据了')
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
      
      const success = await cloudSync.uploadData(data)
      if (success) {
        toast.success('数据已成功上传到云端！')
        await loadCloudInfo()
      } else {
        toast.error('上传失败，请检查 API 密钥是否正确')
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
      const data = await cloudSync.downloadData()
      
      if (data) {
        // 使用 zustand store 的 importData 方法导入数据
        importData(data)
        toast.success('数据已从云端下载并同步！')
      } else {
        toast.info('云端没有找到数据，请先上传数据')
      }
    } catch (error) {
      console.error('下载失败:', error)
      toast.error('下载失败，请检查网络连接或先上传数据')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearConfig = () => {
    cloudSync.clearConfig()
    setIsConfigured(false)
    setCloudInfo(null)
    setApiKey('')
    toast.success('配置已清除')
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isConfigured ? (
            <Cloud className="h-5 w-5 text-blue-500" />
          ) : (
            <CloudOff className="h-5 w-5 text-gray-400" />
          )}
          云端数据同步
        </CardTitle>
        <CardDescription>
          使用免费的 JSONBin.io 服务同步您的基金记录数据，在不同设备间保持数据一致
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
          
          <div className="flex items-center gap-2">
            <Dialog open={showConfig} onOpenChange={setShowConfig}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  {isConfigured ? '重新配置' : '配置 API'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>云端同步配置</DialogTitle>
                  <DialogDescription>
                    请输入您的 JSONBin.io API 密钥。如果您还没有，请访问 jsonbin.io 免费注册。
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="apiKey">API 密钥</Label>
                    <Input
                      id="apiKey"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="$2a$10$..."
                      type="password"
                    />
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg text-sm">
                    <p className="font-medium text-blue-800 mb-2">如何获取 API 密钥:</p>
                    <ol className="text-blue-700 space-y-1 list-decimal list-inside">
                      <li>访问 <a href="https://jsonbin.io" target="_blank" rel="noopener noreferrer" className="underline">jsonbin.io</a></li>
                      <li>免费注册账户</li>
                      <li>在控制台中找到 "API Keys"</li>
                      <li>复制 "X-Master-Key" 密钥</li>
                    </ol>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleSaveConfig} className="flex-1">
                      保存配置
                    </Button>
                    <Button variant="outline" onClick={() => setShowConfig(false)}>
                      取消
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {isConfigured && (
              <Button variant="outline" size="sm" onClick={handleClearConfig}>
                <Trash2 className="h-4 w-4 mr-2" />
                清除配置
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* 云端信息 */}
        {isConfigured && cloudInfo && (
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800">云端数据信息</span>
            </div>
            <div className="text-sm text-green-700">
              <p>最后更新: {cloudInfo.lastUpdated ? new Date(cloudInfo.lastUpdated).toLocaleString('zh-CN') : '未知'}</p>
              <p>数据大小: {cloudInfo.size ? `${(cloudInfo.size / 1024).toFixed(2)} KB` : '未知'}</p>
            </div>
          </div>
        )}

        {/* 同步操作 */}
        {isConfigured && (
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
                <strong>提示:</strong> 上传会将当前数据保存到云端，下载会从云端获取最新数据并覆盖本地数据。
              </p>
            </div>
          </div>
        )}

        {/* 未配置提示 */}
        {!isConfigured && (
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <p className="text-gray-600 mb-3">
              请先配置 JSONBin.io API 密钥以开始使用云端同步功能
            </p>
            <Button onClick={() => setShowConfig(true)}>
              <Settings className="h-4 w-4 mr-2" />
              开始配置
            </Button>
          </div>
        )}

        {/* 服务介绍 */}
        <div className="bg-blue-50 p-3 rounded-lg text-sm">
          <p className="font-medium text-blue-800 mb-1">关于 JSONBin.io:</p>
          <p className="text-blue-700">
            JSONBin.io 是一个免费的 JSON 数据存储服务，每月提供 10,000 次免费 API 调用，
            非常适合个人项目的数据同步需求。
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 
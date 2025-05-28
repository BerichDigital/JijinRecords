'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { toast } from 'sonner'
import { Cloud, CloudOff, Settings, Upload, Download, RefreshCw, Trash2, Info, CheckCircle, AlertCircle, ChevronDown, Bug } from 'lucide-react'
import { cloudSync, type CloudSyncConfig, type FundData } from '@/lib/cloud-sync'
import { useFundStore } from '@/store/fund'

export function CloudSync() {
  const [isConfigured, setIsConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [cloudInfo, setCloudInfo] = useState<any>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  
  // API 配置状态
  const [apiKey, setApiKey] = useState('')
  
  // 从 zustand store 获取数据
  const { transactions, holdings, accountSummary, fundPrices, importData } = useFundStore()

  useEffect(() => {
    // 等待客户端hydration完成
    setIsHydrated(true)
    
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

    try {
      const config: CloudSyncConfig = {
        apiKey: apiKey.trim()
      }

      cloudSync.setConfig(config)
      setIsConfigured(true)
      setShowConfig(false)
      
      // 测试连接
      toast.loading('正在测试连接...', { id: 'test-connection' })
      
      const hasData = await cloudSync.hasCloudData()
      
      toast.dismiss('test-connection')
      
      if (hasData) {
        toast.success('配置成功！检测到云端已有数据，可以下载同步')
      } else {
        toast.success('配置成功！云端暂无数据，可以上传本地数据')
      }
      
      // 重新加载云端信息
      setTimeout(() => {
        loadCloudInfo()
      }, 500)
    } catch (error) {
      console.error('配置失败:', error)
      toast.error('配置失败，请检查 API 密钥是否正确')
    }
  }

  const handleUpload = async () => {
    if (!isHydrated) {
      toast.error('数据还在加载中，请稍后再试')
      return
    }

    try {
      setIsLoading(true)
      const data: FundData = {
        transactions,
        holdings,
        accountSummary,
        fundPrices
      }
      
      // 添加调试信息
      console.log('准备上传的数据:', data)
      console.log('transactions数量:', transactions.length)
      console.log('holdings数量:', holdings.length)
      console.log('accountSummary:', accountSummary)
      console.log('isHydrated:', isHydrated)
      
      // 检查数据是否为空
      if (transactions.length === 0 && holdings.length === 0) {
        toast.warning('当前没有数据可上传，请先添加一些基金交易记录')
        return
      }
      
      const success = await cloudSync.uploadData(data)
      if (success) {
        toast.success(`数据已成功上传到云端！包含 ${transactions.length} 条交易记录，${holdings.length} 个持仓`)
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
      console.log('=== CloudSync组件：开始下载流程 ===')
      console.log('当前组件状态:', {
        isHydrated,
        isConfigured,
        localTransactions: transactions.length,
        localHoldings: holdings.length
      })
      
      const data = await cloudSync.downloadData()
      console.log('=== CloudSync组件：下载完成 ===')
      console.log('下载结果:', data)
      
      if (data) {
        console.log('=== CloudSync组件：准备导入数据 ===')
        console.log('导入前本地数据:', {
          transactions: transactions.length,
          holdings: holdings.length,
          accountSummary
        })
        
        console.log('准备导入的数据:', {
          transactions: data.transactions?.length || 0,
          holdings: data.holdings?.length || 0,
          accountSummary: data.accountSummary
        })
        
        // 使用 zustand store 的 importData 方法导入数据
        console.log('调用importData方法...')
        importData(data)
        
        console.log('=== CloudSync组件：数据导入完成 ===')
        
        // 验证导入结果
        setTimeout(() => {
          console.log('导入后验证 - 当前store状态:', {
            transactions: useFundStore.getState().transactions.length,
            holdings: useFundStore.getState().holdings.length,
            accountSummary: useFundStore.getState().accountSummary
          })
        }, 100)
        
        const transactionCount = data.transactions?.length || 0
        const holdingCount = data.holdings?.length || 0
        
        if (transactionCount > 0 || holdingCount > 0) {
          toast.success(`数据已从云端下载并同步！包含 ${transactionCount} 条交易记录，${holdingCount} 个持仓`)
        } else {
          toast.info('云端数据为空，可能还没有上传过数据')
        }
      } else {
        console.log('=== CloudSync组件：下载失败 ===')
        console.log('下载返回null，可能是网络错误或云端无数据')
        toast.info('云端没有找到数据，请先上传数据或检查网络连接')
      }
    } catch (error) {
      console.error('=== CloudSync组件：下载异常 ===')
      console.error('异常详情:', error)
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
          数据同步
        </CardTitle>
        <CardDescription>
          在不同设备间同步您的基金记录数据
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 配置状态显示 */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            {isConfigured ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-orange-500" />
            )}
            <span className="text-sm font-medium">
              {isConfigured ? '同步已配置' : '需要配置'}
            </span>
          </div>
          
          <Badge variant={isConfigured ? "default" : "secondary"}>
            {isConfigured ? "就绪" : "未配置"}
          </Badge>
        </div>

        {/* 已配置状态 - 显示同步操作 */}
        {isConfigured && (
          <div className="space-y-4">
            {/* 本地数据状态 */}
            {isHydrated && (
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">本地数据</span>
                </div>
                <div className="text-sm text-green-700">
                  <p>交易记录: {transactions.length} 条</p>
                  <p>持仓基金: {holdings.length} 个</p>
                  <p>总投入: ¥{accountSummary.totalInvestment.toFixed(2)}</p>
                </div>
              </div>
            )}
            
            {/* 云端数据信息 */}
            {cloudInfo && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">云端数据</span>
                </div>
                <div className="text-sm text-blue-700">
                  <p>最后更新: {cloudInfo.lastUpdated ? new Date(cloudInfo.lastUpdated).toLocaleString('zh-CN') : '未知'}</p>
                  <p>数据大小: {cloudInfo.size ? `${(cloudInfo.size / 1024).toFixed(2)} KB` : '未知'}</p>
                </div>
              </div>
            )}
            
            {/* 快速同步按钮 */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">快速同步</h4>
              
              <div className="grid grid-cols-1 gap-3">
                <Button 
                  onClick={handleUpload}
                  disabled={isLoading}
                  className="flex items-center gap-2 h-12"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <div className="text-left">
                    <div className="font-medium">上传到云端</div>
                    <div className="text-xs opacity-80">将本地数据保存到云端</div>
                  </div>
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleDownload}
                  disabled={isLoading}
                  className="flex items-center gap-2 h-12"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <div className="text-left">
                    <div className="font-medium">从云端下载</div>
                    <div className="text-xs opacity-80">获取最新的云端数据</div>
                  </div>
                </Button>
              </div>
            </div>

            <Separator />

            {/* 配置管理 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">配置管理</span>
              <div className="flex gap-2">
                <Dialog open={showConfig} onOpenChange={setShowConfig}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      重新配置
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>重新配置云端同步</DialogTitle>
                      <DialogDescription>
                        更新您的 JSONBin.io API 密钥
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

                <Button variant="outline" size="sm" onClick={handleClearConfig}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  清除配置
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 未配置状态 - 显示配置引导 */}
        {!isConfigured && (
          <div className="space-y-4">
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <AlertCircle className="h-8 w-8 text-orange-500 mx-auto mb-3" />
              <h3 className="font-medium text-orange-800 mb-2">首次使用需要配置</h3>
              <p className="text-sm text-orange-700 mb-4">
                配置一次后，所有设备都可以使用相同的配置进行数据同步
              </p>
              <Button onClick={() => setShowConfig(true)} className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                开始配置
              </Button>
            </div>

            {/* 配置对话框 */}
            <Dialog open={showConfig} onOpenChange={setShowConfig}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>配置云端数据同步</DialogTitle>
                  <DialogDescription>
                    请输入您的 JSONBin.io API 密钥。配置一次后，其他设备使用相同密钥即可同步数据。
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
                  
                  <div className="bg-green-50 p-3 rounded-lg text-sm">
                    <p className="font-medium text-green-800 mb-1">多设备同步说明:</p>
                    <p className="text-green-700">
                      配置完成后，在其他设备上使用相同的 API 密钥即可自动同步数据，无需重复配置。
                    </p>
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

            {/* 服务介绍 */}
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="font-medium text-blue-800 mb-1">关于 JSONBin.io:</p>
              <p className="text-blue-700">
                免费的 JSON 数据存储服务，每月提供 10,000 次免费 API 调用，
                非常适合个人项目的数据同步需求。
              </p>
            </div>
          </div>
        )}

        {/* 调试面板 */}
        <Separator />
        <Collapsible open={showDebug} onOpenChange={setShowDebug}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-2">
              <div className="flex items-center gap-2">
                <Bug className="h-4 w-4" />
                <span className="text-sm">调试信息</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${showDebug ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            <div className="bg-gray-50 p-3 rounded-lg text-xs font-mono">
              <div className="space-y-2">
                <div>
                  <span className="font-semibold">组件状态:</span>
                  <div className="ml-2">
                    <div>isHydrated: {String(isHydrated)}</div>
                    <div>isConfigured: {String(isConfigured)}</div>
                    <div>isLoading: {String(isLoading)}</div>
                  </div>
                </div>
                
                <div>
                  <span className="font-semibold">本地数据:</span>
                  <div className="ml-2">
                    <div>transactions: {transactions.length} 条</div>
                    <div>holdings: {holdings.length} 个</div>
                    <div>totalInvestment: ¥{accountSummary.totalInvestment.toFixed(2)}</div>
                    <div>fundPrices: {Object.keys(fundPrices).length} 个</div>
                  </div>
                </div>
                
                {isConfigured && (
                  <div>
                    <span className="font-semibold">云端配置:</span>
                    <div className="ml-2">
                      <div>hasApiKey: {String(!!cloudSync.getConfigStatus().hasApiKey)}</div>
                      <div>hasBinId: {String(!!cloudSync.getConfigStatus().hasBinId)}</div>
                      <div>binId: {cloudInfo?.binId || '未知'}</div>
                    </div>
                  </div>
                )}
                
                {cloudInfo && (
                  <div>
                    <span className="font-semibold">云端数据:</span>
                    <div className="ml-2">
                      <div>lastUpdated: {cloudInfo.lastUpdated || '未知'}</div>
                      <div>size: {cloudInfo.size ? `${cloudInfo.size} bytes` : '未知'}</div>
                      <div>appVersion: {cloudInfo.appVersion || '未知'}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              <p>💡 提示：如果数据同步有问题，请打开浏览器开发者工具查看控制台日志获取详细信息。</p>
              <p>🔧 常见问题：确保API密钥正确，网络连接正常，不同设备使用相同的API密钥。</p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
} 
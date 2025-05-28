'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Download, Upload, FileText, AlertTriangle } from 'lucide-react'
import { useFundStore } from '@/store/fund'

export function DataManager() {
  const [showImportDialog, setShowImportDialog] = useState(false)
  const { transactions, holdings, accountSummary, fundPrices, importData, exportData } = useFundStore()

  // 导出数据到JSON文件
  const handleExport = () => {
    try {
      const data = exportData()
      const jsonString = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `基金投资记录_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success(`数据已导出！包含 ${transactions.length} 条交易记录，${holdings.length} 个持仓`)
    } catch (error) {
      console.error('导出失败:', error)
      toast.error('导出失败，请重试')
    }
  }

  // 导入数据从JSON文件
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/json') {
      toast.error('请选择JSON格式的文件')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)
        
        // 验证数据格式
        if (!data || typeof data !== 'object') {
          throw new Error('无效的数据格式')
        }

        // 检查必要的字段
        const requiredFields = ['transactions', 'holdings', 'accountSummary', 'fundPrices']
        const missingFields = requiredFields.filter(field => !(field in data))
        
        if (missingFields.length > 0) {
          throw new Error(`缺少必要字段: ${missingFields.join(', ')}`)
        }

        // 验证数组类型
        if (!Array.isArray(data.transactions) || !Array.isArray(data.holdings)) {
          throw new Error('交易记录和持仓数据必须是数组格式')
        }

        // 导入数据
        importData(data)
        
        toast.success(`数据导入成功！包含 ${data.transactions.length} 条交易记录，${data.holdings.length} 个持仓`)
        setShowImportDialog(false)
        
        // 清空文件输入
        event.target.value = ''
      } catch (error) {
        console.error('导入失败:', error)
        toast.error(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`)
        event.target.value = ''
      }
    }

    reader.readAsText(file)
  }

  // 清空所有数据
  const handleClearData = () => {
    const emptyData = {
      transactions: [],
      holdings: [],
      accountSummary: {
        totalInvestment: 0,
        totalValue: 0,
        totalProfit: 0,
        totalProfitRate: 0
      },
      fundPrices: {}
    }
    
    importData(emptyData)
    toast.success('所有数据已清空')
  }

  const hasData = transactions.length > 0 || holdings.length > 0

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          数据管理
        </CardTitle>
        <CardDescription>
          导入导出您的基金投资记录数据
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 数据状态显示 */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-800">当前数据</span>
          </div>
          <div className="text-sm text-blue-700">
            <p>交易记录: {transactions.length} 条</p>
            <p>持仓基金: {holdings.length} 个</p>
            <p>总投入: ¥{accountSummary.totalInvestment.toFixed(2)}</p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">数据操作</h4>
          
          <div className="grid grid-cols-1 gap-3">
            {/* 导出数据 */}
            <Button 
              onClick={handleExport}
              disabled={!hasData}
              className="flex items-center gap-2 h-12"
            >
              <Download className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">导出数据</div>
                <div className="text-xs opacity-80">将数据保存为JSON文件</div>
              </div>
            </Button>
            
            {/* 导入数据 */}
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  className="flex items-center gap-2 h-12"
                >
                  <Upload className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">导入数据</div>
                    <div className="text-xs opacity-80">从JSON文件导入数据</div>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>导入数据</DialogTitle>
                  <DialogDescription>
                    选择之前导出的JSON文件来导入数据
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {hasData && (
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-orange-800">注意</span>
                      </div>
                      <p className="text-sm text-orange-700">
                        导入新数据将会覆盖当前所有数据，请确保已经导出备份。
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label htmlFor="import-file" className="block text-sm font-medium mb-2">
                      选择JSON文件
                    </label>
                    <input
                      id="import-file"
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg text-sm">
                    <p className="font-medium text-blue-800 mb-1">支持的文件格式:</p>
                    <p className="text-blue-700">
                      只支持通过本应用导出的JSON格式文件
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowImportDialog(false)} className="flex-1">
                      取消
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* 清空数据 */}
            {hasData && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="destructive"
                    className="flex items-center gap-2 h-12"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <div className="text-left">
                      <div className="font-medium">清空数据</div>
                      <div className="text-xs opacity-80">删除所有记录</div>
                    </div>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>确认清空数据</DialogTitle>
                    <DialogDescription>
                      此操作将删除所有交易记录和持仓数据，且无法恢复。
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="bg-red-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-red-800">警告</span>
                      </div>
                      <p className="text-sm text-red-700">
                        这将永久删除您的所有数据，建议先导出备份。
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1">
                        取消
                      </Button>
                      <Button variant="destructive" onClick={handleClearData} className="flex-1">
                        确认清空
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-green-50 p-3 rounded-lg text-sm">
          <p className="font-medium text-green-800 mb-2">使用说明:</p>
          <ul className="text-green-700 space-y-1 list-disc list-inside">
            <li>导出：将当前数据保存为JSON文件到本地</li>
            <li>导入：从之前导出的JSON文件恢复数据</li>
            <li>数据在浏览器本地存储，清除浏览器数据会丢失</li>
            <li>建议定期导出数据作为备份</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
} 
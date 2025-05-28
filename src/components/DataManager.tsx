'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Download, Upload, FileText, AlertTriangle } from 'lucide-react'
import { useFundStore } from '@/store/fund'
import * as XLSX from 'xlsx'

export function DataManager() {
  const [showImportDialog, setShowImportDialog] = useState(false)
  const { transactions, holdings, accountSummary, fundPrices, importData, exportData } = useFundStore()

  // 导出数据到Excel文件
  const handleExport = () => {
    try {
      const data = exportData()
      
      // 创建工作簿
      const workbook = XLSX.utils.book_new()
      
      // 交易记录工作表
      const transactionsData = data.transactions.map(t => ({
        '交易日期': t.date,
        '基金代码': t.fundCode,
        '基金名称': t.fundName,
        '交易类型': t.type,
        '交易价格': t.price,
        '交易数量': t.quantity,
        '交易金额': t.amount,
        '单位净值': t.unitPrice,
        '手续费': t.fee
      }))
      const transactionsSheet = XLSX.utils.json_to_sheet(transactionsData)
      XLSX.utils.book_append_sheet(workbook, transactionsSheet, '交易记录')
      
      // 持仓详情工作表
      const holdingsData = data.holdings.map(h => ({
        '基金代码': h.fundCode,
        '基金名称': h.fundName,
        '持仓份额': h.totalShares,
        '持仓成本': h.totalCost,
        '平均成本': h.averageCost,
        '当前净值': h.currentPrice,
        '当前市值': h.currentValue,
        '盈亏金额': h.totalProfit,
        '收益率(%)': h.profitRate
      }))
      const holdingsSheet = XLSX.utils.json_to_sheet(holdingsData)
      XLSX.utils.book_append_sheet(workbook, holdingsSheet, '持仓详情')
      
      // 账户概览工作表
      const summaryData = [{
        '总投入': data.accountSummary.totalInvestment,
        '当前市值': data.accountSummary.totalValue,
        '总盈亏': data.accountSummary.totalProfit,
        '总收益率(%)': data.accountSummary.totalProfitRate
      }]
      const summarySheet = XLSX.utils.json_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, '账户概览')
      
      // 基金净值工作表
      const pricesData = Object.entries(data.fundPrices).map(([code, price]) => ({
        '基金代码': code,
        '当前净值': price
      }))
      if (pricesData.length > 0) {
        const pricesSheet = XLSX.utils.json_to_sheet(pricesData)
        XLSX.utils.book_append_sheet(workbook, pricesSheet, '基金净值')
      }
      
      // 导出文件
      const fileName = `基金投资记录_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(workbook, fileName)
      
      toast.success(`数据已导出到Excel文件！包含 ${transactions.length} 条交易记录，${holdings.length} 个持仓`)
    } catch (error) {
      console.error('导出失败:', error)
      toast.error('导出失败，请重试')
    }
  }

  // 从Excel文件导入数据
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 检查文件类型
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('请选择Excel格式的文件(.xlsx 或 .xls)')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // 读取交易记录
        let transactions: any[] = []
        if (workbook.SheetNames.includes('交易记录')) {
          const transactionsSheet = workbook.Sheets['交易记录']
          if (transactionsSheet) {
            const transactionsData = XLSX.utils.sheet_to_json(transactionsSheet)
            
            transactions = transactionsData.map((row: any, index: number) => ({
              id: Date.now().toString() + index.toString(),
              date: row['交易日期'] || '',
              fundCode: row['基金代码'] || '',
              fundName: row['基金名称'] || '',
              type: row['交易类型'] || '买入',
              price: Number(row['交易价格']) || 0,
              quantity: Number(row['交易数量']) || 0,
              amount: Number(row['交易金额']) || 0,
              unitPrice: Number(row['单位净值']) || 0,
              fee: Number(row['手续费']) || 0
            }))
          }
        }
        
        // 读取基金净值（如果存在）
        let fundPrices: Record<string, number> = {}
        if (workbook.SheetNames.includes('基金净值')) {
          const pricesSheet = workbook.Sheets['基金净值']
          if (pricesSheet) {
            const pricesData = XLSX.utils.sheet_to_json(pricesSheet)
            
            pricesData.forEach((row: any) => {
              if (row['基金代码'] && row['当前净值']) {
                fundPrices[row['基金代码']] = Number(row['当前净值'])
              }
            })
          }
        }
        
        // 构建导入数据
        const importDataObj = {
          transactions,
          holdings: [], // 持仓会根据交易记录重新计算
          accountSummary: {
            totalInvestment: 0,
            totalValue: 0,
            totalFees: 0,
            totalProfit: 0,
            totalProfitRate: 0
          },
          fundPrices
        }
        
        // 验证数据
        if (transactions.length === 0) {
          throw new Error('Excel文件中没有找到有效的交易记录数据')
        }
        
        // 导入数据
        importData(importDataObj)
        
        toast.success(`数据导入成功！包含 ${transactions.length} 条交易记录`)
        setShowImportDialog(false)
        
        // 清空文件输入
        event.target.value = ''
      } catch (error) {
        console.error('导入失败:', error)
        toast.error(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`)
        event.target.value = ''
      }
    }

    reader.readAsArrayBuffer(file)
  }

  // 清空所有数据
  const handleClearData = () => {
    const emptyData = {
      transactions: [],
      holdings: [],
      accountSummary: {
        totalInvestment: 0,
        totalValue: 0,
        totalFees: 0,
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
          导入导出您的基金投资记录数据（Excel格式）
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
                <div className="font-medium">导出到Excel</div>
                <div className="text-xs opacity-80">将数据保存为Excel文件</div>
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
                    <div className="font-medium">从Excel导入</div>
                    <div className="text-xs opacity-80">从Excel文件导入数据</div>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>导入数据</DialogTitle>
                  <DialogDescription>
                    选择Excel文件来导入交易记录数据
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
                      选择Excel文件
                    </label>
                    <input
                      id="import-file"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleImport}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg text-sm">
                    <p className="font-medium text-blue-800 mb-2">Excel文件格式要求:</p>
                    <ul className="text-blue-700 space-y-1 list-disc list-inside">
                      <li>支持 .xlsx 和 .xls 格式</li>
                      <li>必须包含"交易记录"工作表</li>
                      <li>列标题：交易日期、基金代码、基金名称、交易类型、交易价格、交易数量、交易金额、单位净值、手续费</li>
                      <li>可选包含"基金净值"工作表（基金代码、当前净值）</li>
                    </ul>
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
            <li>导出：将当前数据保存为Excel文件，包含多个工作表</li>
            <li>导入：从Excel文件的"交易记录"工作表导入数据</li>
            <li>持仓数据会根据交易记录自动计算</li>
            <li>数据在浏览器本地存储，清除浏览器数据会丢失</li>
            <li>建议定期导出数据作为备份</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
} 
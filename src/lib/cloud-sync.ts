interface CloudSyncConfig {
  apiKey: string
  binId?: string
}

interface FundData {
  transactions: any[]
  holdings: any[]
  accountSummary: any
  fundPrices: Record<string, number>
}

class CloudSync {
  private config: CloudSyncConfig | null = null
  private baseUrl = 'https://api.jsonbin.io/v3'

  constructor() {
    // 只在客户端加载配置
    if (typeof window !== 'undefined') {
      this.loadConfig()
    }
  }

  // 设置云端同步配置
  setConfig(config: CloudSyncConfig) {
    this.config = config
    if (typeof window !== 'undefined') {
      localStorage.setItem('cloud-sync-config', JSON.stringify(config))
    }
  }

  // 从 localStorage 加载配置
  private loadConfig() {
    if (typeof window === 'undefined') return
    
    try {
      const saved = localStorage.getItem('cloud-sync-config')
      if (saved) {
        this.config = JSON.parse(saved)
      }
    } catch (error) {
      console.error('加载配置失败:', error)
    }
  }

  // 检查是否已配置
  isConfigured(): boolean {
    return !!(this.config?.apiKey)
  }

  // 生成基于API密钥的固定binId
  private generateBinId(apiKey: string): string {
    // 使用API密钥的一部分生成一致的binId
    // 这确保所有使用相同API密钥的设备都会使用同一个binId
    const hash = this.simpleHash(apiKey + 'jijin-records')
    return hash.substring(0, 24) // JSONBin.io的binId长度通常是24位
  }

  // 简单的哈希函数
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return Math.abs(hash).toString(16).padStart(24, '0')
  }

  // 确保bin存在，如果不存在则创建
  private async ensureBinExists(): Promise<boolean> {
    if (!this.config?.apiKey) {
      return false
    }

    // 如果已经有binId，直接检查是否存在
    if (this.config.binId) {
      try {
        const checkResponse = await fetch(`${this.baseUrl}/b/${this.config.binId}`, {
          method: 'HEAD',
          headers: {
            'X-Master-Key': this.config.apiKey
          }
        })

        if (checkResponse.ok) {
          return true
        }
        // 如果bin不存在，清除无效的binId
        this.config.binId = undefined
        this.setConfig(this.config)
      } catch (error) {
        console.error('检查现有bin失败:', error)
        this.config.binId = undefined
        this.setConfig(this.config)
      }
    }

    // 生成基于API密钥的固定binId
    const fixedBinId = this.generateBinId(this.config.apiKey)
    
    try {
      // 首先尝试使用固定的binId检查是否存在
      const checkResponse = await fetch(`${this.baseUrl}/b/${fixedBinId}`, {
        method: 'HEAD',
        headers: {
          'X-Master-Key': this.config.apiKey
        }
      })

      if (checkResponse.ok) {
        // bin存在，保存binId
        this.config.binId = fixedBinId
        this.setConfig(this.config)
        return true
      }

      // bin不存在，尝试创建一个新的bin
      const createResponse = await fetch(`${this.baseUrl}/b`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': this.config.apiKey,
          'X-Bin-Name': `jijin-records-${this.simpleHash(this.config.apiKey).substring(0, 8)}`
        },
        body: JSON.stringify({
          _metadata: {
            appName: "基金投资记录助手",
            version: "1.0.0",
            created: new Date().toISOString(),
            apiKeyHash: this.simpleHash(this.config.apiKey).substring(0, 8),
            fixedBinId: fixedBinId
          },
          transactions: [],
          holdings: [],
          accountSummary: {
            totalInvestment: 0,
            totalValue: 0,
            totalProfit: 0,
            totalProfitRate: 0
          },
          fundPrices: {}
        })
      })

      if (createResponse.ok) {
        const result = await createResponse.json()
        const actualBinId = result.metadata?.id
        
        // 如果创建的binId和我们期望的不同，我们需要使用实际的binId
        this.config.binId = actualBinId
        this.setConfig(this.config)
        
        // 同时尝试创建一个指向实际bin的"别名"记录
        try {
          await fetch(`${this.baseUrl}/b`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Master-Key': this.config.apiKey,
              'X-Bin-Name': `jijin-alias-${this.simpleHash(this.config.apiKey).substring(0, 8)}`
            },
            body: JSON.stringify({
              _alias: true,
              actualBinId: actualBinId,
              apiKeyHash: this.simpleHash(this.config.apiKey).substring(0, 8)
            })
          })
        } catch (aliasError) {
          console.log('创建别名失败，但不影响主要功能:', aliasError)
        }
        
        return true
      }

      return false
    } catch (error) {
      console.error('创建bin失败:', error)
      return false
    }
  }

  // 上传数据到云端
  async uploadData(data: FundData): Promise<boolean> {
    if (!this.config?.apiKey) {
      throw new Error('请先设置 API 密钥')
    }

    try {
      // 确保bin存在
      const binExists = await this.ensureBinExists()
      if (!binExists || !this.config.binId) {
        throw new Error('无法创建或访问数据存储')
      }

      const uploadData = {
        _metadata: {
          appName: "基金投资记录助手",
          version: "1.0.0",
          lastUpdated: new Date().toISOString(),
          deviceInfo: {
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown',
            timestamp: Date.now()
          }
        },
        ...data
      }

      const response = await fetch(`${this.baseUrl}/b/${this.config.binId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': this.config.apiKey
        },
        body: JSON.stringify(uploadData)
      })

      return response.ok
    } catch (error) {
      console.error('上传数据失败:', error)
      return false
    }
  }

  // 从云端下载数据
  async downloadData(): Promise<FundData | null> {
    if (!this.config?.apiKey) {
      throw new Error('请先设置 API 密钥')
    }

    try {
      console.log('开始下载数据，当前配置:', {
        hasApiKey: !!this.config.apiKey,
        binId: this.config.binId
      })

      // 确保bin存在
      const binExists = await this.ensureBinExists()
      console.log('bin存在检查结果:', binExists, '当前binId:', this.config.binId)
      
      if (!binExists || !this.config.binId) {
        console.log('bin不存在，返回空数据')
        // 如果bin不存在，返回空数据
        return {
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
      }

      console.log('正在从云端下载数据，binId:', this.config.binId)
      const response = await fetch(`${this.baseUrl}/b/${this.config.binId}/latest`, {
        headers: {
          'X-Master-Key': this.config.apiKey
        }
      })

      console.log('下载响应状态:', response.status, response.statusText)

      if (response.ok) {
        const result = await response.json()
        console.log('下载的原始数据:', result)
        
        const data = result.record
        console.log('解析后的record数据:', data)
        
        // 移除元数据，只返回基金数据
        const { _metadata, ...fundData } = data
        console.log('最终返回的基金数据:', fundData)
        
        return fundData
      } else {
        console.error('下载失败，响应状态:', response.status)
        const errorText = await response.text()
        console.error('错误详情:', errorText)
      }
      
      return null
    } catch (error) {
      console.error('下载数据失败:', error)
      return null
    }
  }

  // 检查云端是否有数据
  async hasCloudData(): Promise<boolean> {
    if (!this.config?.apiKey) {
      return false
    }

    try {
      const binExists = await this.ensureBinExists()
      return binExists
    } catch (error) {
      return false
    }
  }

  // 获取云端数据信息
  async getCloudDataInfo(): Promise<any> {
    if (!this.config?.apiKey) {
      return null
    }

    try {
      const binExists = await this.ensureBinExists()
      if (!binExists || !this.config.binId) {
        return null
      }

      const response = await fetch(`${this.baseUrl}/b/${this.config.binId}`, {
        headers: {
          'X-Master-Key': this.config.apiKey
        }
      })

      if (response.ok) {
        const result = await response.json()
        const metadata = result.record?._metadata
        return {
          lastUpdated: metadata?.lastUpdated || result.metadata?.createdAt,
          size: JSON.stringify(result.record).length,
          binId: this.config.binId,
          deviceInfo: metadata?.deviceInfo,
          appVersion: metadata?.version
        }
      }
      
      return null
    } catch (error) {
      console.error('获取云端数据信息失败:', error)
      return null
    }
  }

  // 清除配置
  clearConfig() {
    this.config = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cloud-sync-config')
    }
  }

  // 获取当前配置状态
  getConfigStatus() {
    return {
      hasApiKey: !!(this.config?.apiKey),
      hasBinId: !!(this.config?.binId),
      isConfigured: this.isConfigured()
    }
  }
}

export const cloudSync = new CloudSync()
export type { FundData, CloudSyncConfig } 
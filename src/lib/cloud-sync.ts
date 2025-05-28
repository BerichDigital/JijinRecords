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
    // 从 localStorage 加载配置
    this.loadConfig()
  }

  // 设置云端同步配置
  setConfig(config: CloudSyncConfig) {
    this.config = config
    localStorage.setItem('cloud-sync-config', JSON.stringify(config))
  }

  // 从 localStorage 加载配置
  private loadConfig() {
    const saved = localStorage.getItem('cloud-sync-config')
    if (saved) {
      this.config = JSON.parse(saved)
    }
  }

  // 检查是否已配置
  isConfigured(): boolean {
    return !!(this.config?.apiKey)
  }

  // 上传数据到云端
  async uploadData(data: FundData): Promise<boolean> {
    if (!this.config?.apiKey) {
      throw new Error('请先设置 API 密钥')
    }

    try {
      const url = this.config.binId 
        ? `${this.baseUrl}/b/${this.config.binId}`
        : `${this.baseUrl}/b`

      const method = this.config.binId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': this.config.apiKey,
          'X-Bin-Name': 'jijin-records-data'
        },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        const result = await response.json()
        
        // 如果是首次创建，保存 bin ID
        if (!this.config.binId && result.metadata?.id) {
          this.config.binId = result.metadata.id
          this.setConfig(this.config)
        }
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('上传数据失败:', error)
      return false
    }
  }

  // 从云端下载数据
  async downloadData(): Promise<FundData | null> {
    if (!this.config?.apiKey || !this.config?.binId) {
      throw new Error('请先设置 API 密钥或尚未上传过数据')
    }

    try {
      const response = await fetch(`${this.baseUrl}/b/${this.config.binId}/latest`, {
        headers: {
          'X-Master-Key': this.config.apiKey
        }
      })

      if (response.ok) {
        const result = await response.json()
        return result.record
      }
      
      return null
    } catch (error) {
      console.error('下载数据失败:', error)
      return null
    }
  }

  // 检查云端是否有数据
  async hasCloudData(): Promise<boolean> {
    if (!this.config?.apiKey || !this.config?.binId) {
      return false
    }

    try {
      const response = await fetch(`${this.baseUrl}/b/${this.config.binId}`, {
        method: 'HEAD',
        headers: {
          'X-Master-Key': this.config.apiKey
        }
      })

      return response.ok
    } catch (error) {
      return false
    }
  }

  // 获取云端数据信息
  async getCloudDataInfo(): Promise<any> {
    if (!this.config?.apiKey || !this.config?.binId) {
      return null
    }

    try {
      const response = await fetch(`${this.baseUrl}/b/${this.config.binId}`, {
        headers: {
          'X-Master-Key': this.config.apiKey
        }
      })

      if (response.ok) {
        const result = await response.json()
        return {
          lastUpdated: result.metadata?.createdAt,
          size: JSON.stringify(result.record).length
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
    localStorage.removeItem('cloud-sync-config')
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
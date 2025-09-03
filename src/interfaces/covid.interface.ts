export interface CovidData {
  date: string
  confirmed: number
  deaths: number
  active: number
  region: Province
}

interface Province {
  province: string
}

export interface CovidAPIResponse {
  data: CovidData[]
}

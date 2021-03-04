import { useEffect, useState, useCallback, useMemo } from 'react'
import { useWeb3Context } from 'web3-react'
import {
  isAddress,
  getTokenContract,
  getPairContract,
  getRouterContract,
  getStakingContract,
  getTokenPairAddressFromFactory,
  getEtherBalance,
  getTokenBalance,
  getTokenAllowance,
  getStakedToken,
  getStakedRewards,
  getTotalStaked,
  getMigrationContract,
  getDripp,
  TOKEN_ADDRESSES,
  STAKING_ADDRESSES
} from '../utils'
import { utils } from 'ethers'
import { BigNumber } from 'ethers/utils'

export function useBlockEffect(functionToRun) {
  const { library } = useWeb3Context()

  useEffect(() => {
    if (library) {
      function wrappedEffect(blockNumber) {
        functionToRun(blockNumber)
      }
      library.on('block', wrappedEffect)
      return () => {
        library.removeListener('block', wrappedEffect)
      }
    }
  }, [library, functionToRun])
}

export function useTokenContract(tokenAddress, withSignerIfPossible = true) {
  const { library, account } = useWeb3Context()

  return useMemo(() => {
    try {
      return getTokenContract(tokenAddress, library, withSignerIfPossible ? account : undefined)
    } catch {
      return null
    }
  }, [account, library, tokenAddress, withSignerIfPossible])
}

export function usePairContract(tokenAddressA, tokenAddressB, withSignerIfPossible = true) {
  const { library, account } = useWeb3Context()

  const [pairAddress, setPairAddress] = useState()

  useEffect(() => {
    if (isAddress(tokenAddressA) && isAddress(tokenAddressB)) {
      let stale = false
      getTokenPairAddressFromFactory(tokenAddressA, tokenAddressB, library).then(pairAddress => {
        if (!stale) {
          setPairAddress(pairAddress)
        }
      })
      return () => {
        stale = true
        setPairAddress()
      }
    }
  }, [library, tokenAddressA, tokenAddressB])
  return useMemo(() => {
    try {
      return getPairContract(pairAddress, library, withSignerIfPossible ? account : undefined)
    } catch {
      return null
    }
  }, [pairAddress, library, withSignerIfPossible, account])
}

export function useRouterContract(withSignerIfPossible = true) {
  const { library, account } = useWeb3Context()

  return useMemo(() => {
    try {
      return getRouterContract(library, withSignerIfPossible ? account : undefined)
    } catch {
      return null
    }
  }, [library, withSignerIfPossible, account])
}

export function useStakingContract(withSignerIfPossible = true) {
  const { library, account } = useWeb3Context()

  return useMemo(() => {
    try {
      return getStakingContract(library, withSignerIfPossible ? account : undefined)
    } catch {
      return null
    }
  }, [library, withSignerIfPossible, account])
}

export function useMigrationContract(tokenSymbol, version, withSignerIfPossible = true) {
  const { library, account } = useWeb3Context()

  return useMemo(() => {
    try {
      return getMigrationContract(tokenSymbol, version, library, withSignerIfPossible ? account : undefined)
    } catch {
      return null
    }
  }, [library, withSignerIfPossible, account])
}

export function useAddressBalance(address, tokenAddress) {
  const { library } = useWeb3Context()

  const [balance, setBalance] = useState()
  const updateBalance = useCallback(() => {
    if (isAddress(address) && (tokenAddress === 'ETH' || isAddress(tokenAddress))) {
      let stale = false

      ;(tokenAddress === 'ETH' ? getEtherBalance(address, library) : getTokenBalance(tokenAddress, address, library))
        .then(value => {
          if (!stale) {
            setBalance(value)
          }
        })
        .catch(() => {
          if (!stale) {
            setBalance(null)
          }
        })
      return () => {
        stale = true
        setBalance()
      }
    }
  }, [address, library, tokenAddress])

  useEffect(() => {
    return updateBalance()
  }, [updateBalance])

  useBlockEffect(updateBalance)
  return balance
}

export function useTotalSupply(contract) {
  const [totalSupply, setTotalSupply] = useState()

  const updateTotalSupply = useCallback(() => {
    if (!!contract) {
      let stale = false

      contract
        .totalSupply()
        .then(value => {
          if (!stale) {
            setTotalSupply(value)
          }
        })
        .catch(() => {
          if (!stale) {
            setTotalSupply(null)
          }
        })
      return () => {
        stale = true
        setTotalSupply()
      }
    }
  }, [contract])

  useEffect(() => {
    return updateTotalSupply()
  }, [updateTotalSupply])

  useBlockEffect(updateTotalSupply)

  return totalSupply && Math.round(Number(utils.formatEther(totalSupply)))
}

export function usePairReserves(tokenAddress) {
  const pairContract = usePairContract(tokenAddress, TOKEN_ADDRESSES.WXDAI)

  const reserveETH = useAddressBalance(pairContract && pairContract.address, TOKEN_ADDRESSES.WXDAI)
  const reserveToken = useAddressBalance(pairContract && pairContract.address, tokenAddress)

  return { reserveETH, reserveToken }
}

export function useAddressAllowance(address, tokenAddress, spenderAddress) {
  const { library } = useWeb3Context()

  const [allowance, setAllowance] = useState()

  const updateAllowance = useCallback(() => {
    if (isAddress(address) && isAddress(tokenAddress) && isAddress(spenderAddress)) {
      let stale = false

      getTokenAllowance(address, tokenAddress, spenderAddress, library)
        .then(allowance => {
          if (!stale) {
            setAllowance(allowance)
          }
        })
        .catch(() => {
          if (!stale) {
            setAllowance(null)
          }
        })

      return () => {
        stale = true
        setAllowance()
      }
    }
  }, [address, library, spenderAddress, tokenAddress])

  useEffect(() => {
    return updateAllowance()
  }, [updateAllowance])

  useBlockEffect(updateAllowance)

  return allowance
}

export function usePairAllowance(address, tokenAddressA, tokenAddressB) {
  const pairContract = usePairContract(tokenAddressA, tokenAddressB)
  const allowanceTokenA = useAddressAllowance(address, tokenAddressA, pairContract && pairContract.address)
  const allowanceTokenB = useAddressAllowance(address, tokenAddressB, pairContract && pairContract.address)
  return [allowanceTokenA, allowanceTokenB]
}

export function useStakingAllowance(address, tokenAddress) {
  const stakingContract = useStakingContract()
  const allowanceToken = useAddressAllowance(address, tokenAddress, stakingContract && stakingContract.address)
  return allowanceToken
}

export function useStakingRewards(address, tokenAddress) {
  const { library } = useWeb3Context()

  const [stakedRewards, setStakedRewards] = useState()

  const updateStakedRewards = useCallback(() => {
    if (isAddress(address) && isAddress(tokenAddress)) {
      let stale = false
      getStakedRewards(address, tokenAddress, library)
        .then(reward => {
          if (!stale) {
            setStakedRewards(reward)
          }
        })
        .catch(() => {
          if (!stale) {
            setStakedRewards(null)
          }
        })
      return () => {
        stale = true
        setStakedRewards()
      }
    }
  }, [address, library, tokenAddress])

  useEffect(() => {
    return updateStakedRewards()
  }, [updateStakedRewards])

  useBlockEffect(updateStakedRewards)

  return stakedRewards
}

export function useStakedToken(address, tokenAddress, isLiquidity) {
  const { library } = useWeb3Context()

  const [stakedToken, setStakedToken] = useState()

  const updateStakedToken = useCallback(() => {
    if (isAddress(address) && isAddress(tokenAddress)) {
      let stale = false
      getStakedToken(address, tokenAddress, isLiquidity, library)
        .then(staked => {
          if (!stale) {
            setStakedToken(staked)
          }
        })
        .catch(() => {
          if (!stale) {
            setStakedToken(null)
          }
        })
      return () => {
        stale = true
        setStakedToken()
      }
    }
  }, [address, library, isLiquidity, tokenAddress])

  useEffect(() => {
    return updateStakedToken()
  }, [updateStakedToken])

  useBlockEffect(updateStakedToken)

  return stakedToken
}

export function useTotalStaked(tokenAddress) {
  const { library } = useWeb3Context()

  const [totalStaked, setTotalStaked] = useState()

  const updateTotalStaked = useCallback(() => {
    if (isAddress(tokenAddress)) {
      let stale = false
      getTotalStaked(tokenAddress, library)
        .then(staked => {
          if (!stale) {
            setTotalStaked(staked)
          }
        })
        .catch(() => {
          if (!stale) {
            setTotalStaked(null)
          }
        })
      return () => {
        stale = true
        setTotalStaked()
      }
    }
  }, [library, tokenAddress])

  useEffect(() => {
    return updateTotalStaked()
  }, [updateTotalStaked])

  useBlockEffect(updateTotalStaked)

  return totalStaked
}
export function useDrippRate(tokenAddress) {
  const { library } = useWeb3Context()

  const [drippRate, setDrippRate] = useState()

  const updateDrippRate = useCallback(() => {
    if (isAddress(tokenAddress)) {
      let stale = false
      getDripp(tokenAddress, library)
        .then(dripp => {
          if (!stale) {
            const rate = dripp.supply.div(dripp.activeTime)
            setDrippRate(rate)
          }
        })
        .catch(() => {
          if (!stale) {
            setDrippRate(null)
          }
        })
      return () => {
        stale = true
        setDrippRate()
      }
    }
  }, [library, tokenAddress])

  useEffect(() => {
    return updateDrippRate()
  }, [updateDrippRate])

  useBlockEffect(updateDrippRate)

  return drippRate
}

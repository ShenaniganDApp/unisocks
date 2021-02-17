import React, { useState, useCallback, useEffect } from 'react'
import { useWeb3Context } from 'web3-react'
import { ethers, BigNumber } from 'ethers'

import { TOKEN_SYMBOLS, TOKEN_ADDRESSES, ERROR_CODES } from '../../utils'
import {
  useTokenContract,
  useExchangeContract,
  useAddressBalance,
  useAddressAllowance,
  useExchangeReserves,
  useExchangeAllowance,
  useTotalSupply
} from '../../hooks'
import Body from '../Body'
import Stats from '../Stats'
import Status from '../Status'

// denominated in bips
const GAS_MARGIN = ethers.utils.bigNumberify(1000)

export function calculateGasMargin(value, margin) {
  const offset = value.mul(margin).div(ethers.utils.bigNumberify(10000))
  return value.add(offset)
}

// denominated in seconds
const DEADLINE_FROM_NOW = 60 * 15

// denominated in bips
const ALLOWED_SLIPPAGE = ethers.utils.bigNumberify(200)

function calculateSlippageBounds(value) {
  const offset = value.mul(ALLOWED_SLIPPAGE).div(ethers.utils.bigNumberify(10000))
  const minimum = value.sub(offset)
  const maximum = value.add(offset)
  return {
    minimum: minimum.lt(ethers.constants.Zero) ? ethers.constants.Zero : minimum,
    maximum: maximum.gt(ethers.constants.MaxUint256) ? ethers.constants.MaxUint256 : maximum
  }
}

// this mocks the getInputPrice function, and calculates the required output
function calculateEtherTokenOutputFromInput(inputAmount, inputReserve, outputReserve) {
  const inputAmountWithFee = inputAmount.mul(ethers.utils.bigNumberify(997))
  const numerator = inputAmountWithFee.mul(outputReserve)
  const denominator = inputReserve.mul(ethers.utils.bigNumberify(1000)).add(inputAmountWithFee)
  return numerator.div(denominator)
}

// this mocks the getOutputPrice function, and calculates the required input
function calculateEtherTokenInputFromOutput(outputAmount, inputReserve, outputReserve) {
  const numerator = inputReserve.mul(outputAmount).mul(ethers.utils.bigNumberify(1000))
  const denominator = outputReserve.sub(outputAmount).mul(ethers.utils.bigNumberify(997))
  return numerator.div(denominator).add(ethers.constants.One)
}

// get exchange rate for a token/ETH pair
function getExchangeRate(inputValue, outputValue, invert = false) {
  const inputDecimals = 18
  const outputDecimals = 18

  if (inputValue && inputDecimals && outputValue && outputDecimals) {
    const factor = ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(18))

    if (invert) {
      return inputValue
        .mul(factor)
        .div(outputValue)
        .mul(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(outputDecimals)))
        .div(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(inputDecimals)))
    } else {
      return outputValue
        .mul(factor)
        .div(inputValue)
        .mul(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(inputDecimals)))
        .div(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(outputDecimals)))
    }
  }
}

function calculateAmount(
  inputTokenSymbol,
  outputTokenSymbol,
  drippAmount,
  reserveDrippETH,
  reserveDrippToken,
  reserveSelectedTokenETH,
  reserveSelectedTokenToken
) {
  // eth to token - buy
  if (
    inputTokenSymbol === TOKEN_SYMBOLS.ETH &&
    (outputTokenSymbol === TOKEN_SYMBOLS.SHWEATPANTS || outputTokenSymbol === TOKEN_SYMBOLS.ALVIN)
  ) {
    const amount = calculateEtherTokenInputFromOutput(drippAmount, reserveDrippETH, reserveDrippToken)
    if (amount.lte(ethers.constants.Zero) || amount.gte(ethers.constants.MaxUint256)) {
      throw Error()
    }
    return amount
  }

  // token to eth - sell
  if (
    (outputTokenSymbol === TOKEN_SYMBOLS.SHWEATPANTS || outputTokenSymbol === TOKEN_SYMBOLS.ALVIN) &&
    outputTokenSymbol === TOKEN_SYMBOLS.ETH
  ) {
    const amount = calculateEtherTokenOutputFromInput(drippAmount, reserveDrippToken, reserveDrippETH)
    if (amount.lte(ethers.constants.Zero) || amount.gte(ethers.constants.MaxUint256)) {
      throw Error()
    }

    return amount
  }

  // token to token - buy or sell
  const buyingDripp = outputTokenSymbol === TOKEN_SYMBOLS.SHWEATPANTS || outputTokenSymbol === TOKEN_SYMBOLS.ALVIN

  if (buyingDripp) {
    // eth needed to buy x socks
    const intermediateValue = calculateEtherTokenInputFromOutput(drippAmount, reserveDrippETH, reserveDrippToken)
    // calculateEtherTokenOutputFromInput
    if (intermediateValue.lte(ethers.constants.Zero) || intermediateValue.gte(ethers.constants.MaxUint256)) {
      throw Error()
    }
    // tokens needed to buy x eth
    const amount = calculateEtherTokenInputFromOutput(
      intermediateValue,
      reserveSelectedTokenToken,
      reserveSelectedTokenETH
    )
    if (amount.lte(ethers.constants.Zero) || amount.gte(ethers.constants.MaxUint256)) {
      throw Error()
    }
    return amount
  } else {
    // eth gained from selling x socks
    const intermediateValue = calculateEtherTokenOutputFromInput(drippAmount, reserveDrippToken, reserveDrippETH)
    if (intermediateValue.lte(ethers.constants.Zero) || intermediateValue.gte(ethers.constants.MaxUint256)) {
      throw Error()
    }
    // tokens yielded from selling x eth
    const amount = calculateEtherTokenOutputFromInput(
      intermediateValue,
      reserveSelectedTokenETH,
      reserveSelectedTokenToken
    )
    if (amount.lte(ethers.constants.Zero) || amount.gte(ethers.constants.MaxUint256)) {
      throw Error()
    }
    return amount
  }
}

export default function Main({ stats, status }) {
  const { library, account } = useWeb3Context()

  // selected token
  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState(TOKEN_SYMBOLS.ETH)

  // get exchange contracts
  const exchangeContractSHWEATPANTS = useExchangeContract(TOKEN_ADDRESSES.SHWEATPANTS)
  const exchangeContractALVIN = useExchangeContract(TOKEN_ADDRESSES.ALVIN)
  const exchangeContractSelectedToken = useExchangeContract(TOKEN_ADDRESSES[selectedTokenSymbol])

  // get token contracts
  const tokenContractSHWEATPANTS = useTokenContract(TOKEN_ADDRESSES.SHWEATPANTS)
  const tokenContractALVIN = useTokenContract(TOKEN_ADDRESSES.ALVIN)
  const tokenContractSelectedToken = useTokenContract(TOKEN_ADDRESSES[selectedTokenSymbol])

  // get balances
  const balanceETH = useAddressBalance(account, TOKEN_ADDRESSES.ETH)
  const balanceSHWEATPANTS = useAddressBalance(account, TOKEN_ADDRESSES.SHWEATPANTS)
  const balanceALVIN = useAddressBalance(account, TOKEN_ADDRESSES.ALVIN)
  const balanceSelectedToken = useAddressBalance(account, TOKEN_ADDRESSES[selectedTokenSymbol])

  // totalsupply
  const totalSHWEATPANTSSupply = useTotalSupply(tokenContractSHWEATPANTS)
  const totalALVINSupply = useTotalSupply(tokenContractALVIN)

  // get allowances
  const allowanceSHWEATPANTS = useAddressAllowance(
    account,
    TOKEN_ADDRESSES.SHWEATPANTS,
    exchangeContractSHWEATPANTS && exchangeContractSHWEATPANTS.address
  )
  const allowanceALVIN = useAddressAllowance(
    account,
    TOKEN_ADDRESSES.ALVIN,
    exchangeContractALVIN && exchangeContractALVIN.address
  )

  const allowanceSelectedToken = useExchangeAllowance(account, TOKEN_ADDRESSES[selectedTokenSymbol])

  // get reserves
  const reserveSHWEATPANTSETH = useAddressBalance(
    exchangeContractSHWEATPANTS && exchangeContractSHWEATPANTS.address,
    TOKEN_ADDRESSES.ETH
  )
  const reserveSHWEATPANTSToken = useAddressBalance(
    exchangeContractSHWEATPANTS && exchangeContractSHWEATPANTS.address,
    TOKEN_ADDRESSES.SHWEATPANTS
  )
  const reserveALVINETH = useAddressBalance(exchangeContractALVIN && exchangeContractALVIN.address, TOKEN_ADDRESSES.ETH)
  const reserveALVINToken = useAddressBalance(
    exchangeContractALVIN && exchangeContractALVIN.address,
    TOKEN_ADDRESSES.ALVIN
  )
  const { reserveETH: reserveSelectedTokenETH, reserveToken: reserveSelectedTokenToken } = useExchangeReserves(
    TOKEN_ADDRESSES[selectedTokenSymbol]
  )

  const [USDExchangeRateETH, setUSDExchangeRateETH] = useState()
  const [USDExchangeRateSelectedToken, setUSDExchangeRateSelectedToken] = useState()

  const ready = !!(
    (account === null || allowanceSHWEATPANTS) &&
    (account === null || allowanceALVIN) &&
    (selectedTokenSymbol === 'ETH' || account === null || allowanceSelectedToken) &&
    (account === null || balanceETH) &&
    (account === null || balanceSHWEATPANTS) &&
    (account === null || balanceALVIN) &&
    (account === null || balanceSelectedToken) &&
    reserveSHWEATPANTSETH &&
    reserveALVINETH &&
    reserveSHWEATPANTSToken &&
    reserveALVINToken &&
    (selectedTokenSymbol === 'ETH' || reserveSelectedTokenETH) &&
    (selectedTokenSymbol === 'ETH' || reserveSelectedTokenToken) &&
    selectedTokenSymbol &&
    (USDExchangeRateETH || USDExchangeRateSelectedToken)
  )

  useEffect(() => {
    //@TODO
    try {
      const exchangeRateDAI = BigNumber.from('100000000000000000000')

      if (selectedTokenSymbol === TOKEN_SYMBOLS.ETH) {
        setUSDExchangeRateETH(exchangeRateDAI)
      } else {
        const exchangeRateSelectedToken = getExchangeRate(reserveSelectedTokenETH, reserveSelectedTokenToken)
        if (exchangeRateSelectedToken) {
          setUSDExchangeRateSelectedToken(
            exchangeRateDAI
              .mul(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(18)))
              .div(exchangeRateSelectedToken)
          )
        }
      }
    } catch {
      setUSDExchangeRateETH()
      setUSDExchangeRateSelectedToken()
    }
  }, [ reserveSelectedTokenETH, reserveSelectedTokenToken, selectedTokenSymbol])

  function _dollarize(amount, exchangeRate) {
    return amount.mul(exchangeRate).div(ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(18)))
  }

  function dollarize(amount) {
    return _dollarize(
      amount,
      selectedTokenSymbol === TOKEN_SYMBOLS.ETH ? USDExchangeRateETH : USDExchangeRateSelectedToken
    )
  }

  const [shweatpantsDollarPrice, setSHWEATPANTSDollarPrice] = useState()
  const [alvinDollarPrice, setALVINDollarPrice] = useState()
  useEffect(() => {
    try {
      const SHWEATPANTSExchangeRateETH = getExchangeRate(reserveSHWEATPANTSToken, reserveSHWEATPANTSETH)
      setSHWEATPANTSDollarPrice(
        SHWEATPANTSExchangeRateETH.mul(USDExchangeRateETH).div(
          ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(18))
        )
      )
      const ALVINExchangeRateETH = getExchangeRate(reserveALVINToken, reserveALVINETH)
      setALVINDollarPrice(
        ALVINExchangeRateETH.mul(USDExchangeRateETH).div(
          ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(18))
        )
      )
    } catch {
      setSHWEATPANTSDollarPrice()
      setALVINDollarPrice()
    }
  }, [USDExchangeRateETH, reserveSHWEATPANTSETH, reserveSHWEATPANTSToken, reserveALVINETH, reserveALVINToken])

  async function unlock(buyingSHWEATPANTS, buyingALVIN) {
    //@TODO
    if (buyingSHWEATPANTS) {
      const contract = buyingSHWEATPANTS ? tokenContractSelectedToken : tokenContractSHWEATPANTS
      const spenderAddress = buyingSHWEATPANTS
        ? exchangeContractSelectedToken.address
        : exchangeContractSHWEATPANTS.address
      const estimatedGasLimit = await contract.estimate.approve(spenderAddress, ethers.constants.MaxUint256)
      const estimatedGasPrice = await library
        .getGasPrice()
        .then(gasPrice => gasPrice.mul(ethers.utils.bigNumberify(150)).div(ethers.utils.bigNumberify(100)))

      return contract.approve(spenderAddress, ethers.constants.MaxUint256, {
        gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
        gasPrice: estimatedGasPrice
      })
    } else if (buyingALVIN) {
      const contract = buyingALVIN ? tokenContractSelectedToken : tokenContractALVIN
      const spenderAddress = buyingALVIN ? exchangeContractSelectedToken.address : exchangeContractALVIN.address
      const estimatedGasLimit = await contract.estimate.approve(spenderAddress, ethers.constants.MaxUint256)
      const estimatedGasPrice = await library
        .getGasPrice()
        .then(gasPrice => gasPrice.mul(ethers.utils.bigNumberify(150)).div(ethers.utils.bigNumberify(100)))

      return contract.approve(spenderAddress, ethers.constants.MaxUint256, {
        gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
        gasPrice: estimatedGasPrice
      })
    } else {
      return
    }
  }

  // buy functionality
  const validateBuy = useCallback(
    (numberOfDripp, tokenSymbol) => {
      // validate passed amount
      let parsedValue
      try {
        parsedValue = ethers.utils.parseUnits(numberOfDripp, 18)
      } catch (error) {
        error.code = ERROR_CODES.INVALID_AMOUNT
        throw error
      }

      let requiredValueInSelectedToken
      if (tokenSymbol === 'ALVIN') {
        try {
          requiredValueInSelectedToken = calculateAmount(
            selectedTokenSymbol,
            TOKEN_SYMBOLS.ALVIN,
            parsedValue,
            reserveALVINETH,
            reserveALVINToken,
            reserveSelectedTokenETH,
            reserveSelectedTokenToken
          )
        } catch (error) {
          error.code = ERROR_CODES.INVALID_TRADE
          throw error
        }
      } else if (tokenSymbol === 'SHWEATPANTS') {
        try {
          requiredValueInSelectedToken = calculateAmount(
            selectedTokenSymbol,
            TOKEN_SYMBOLS.ALVIN,
            parsedValue,
            reserveALVINETH,
            reserveALVINToken,
            reserveSelectedTokenETH,
            reserveSelectedTokenToken
          )
        } catch (error) {
          error.code = ERROR_CODES.INVALID_TRADE
          throw error
        }
      }

      // get max slippage amount
      const { maximum } = calculateSlippageBounds(requiredValueInSelectedToken)

      // the following are 'non-breaking' errors that will still return the data
      let errorAccumulator
      // validate minimum ether balance
      if (balanceETH && balanceETH.lt(ethers.utils.parseEther('.01'))) {
        const error = Error()
        error.code = ERROR_CODES.INSUFFICIENT_ETH_GAS
        if (!errorAccumulator) {
          errorAccumulator = error
        }
      }

      // validate minimum selected token balance
      if (balanceSelectedToken && maximum && balanceSelectedToken.lt(maximum)) {
        const error = Error()
        error.code = ERROR_CODES.INSUFFICIENT_SELECTED_TOKEN_BALANCE
        if (!errorAccumulator) {
          errorAccumulator = error
        }
      }

      // validate allowance
      if (selectedTokenSymbol !== 'ETH') {
        if (allowanceSelectedToken && maximum && allowanceSelectedToken.lt(maximum)) {
          const error = Error()
          error.code = ERROR_CODES.INSUFFICIENT_ALLOWANCE
          if (!errorAccumulator) {
            errorAccumulator = error
          }
        }
      }

      return {
        inputValue: requiredValueInSelectedToken,
        maximumInputValue: maximum,
        outputValue: parsedValue,
        error: errorAccumulator
      }
    },
    [
      allowanceSelectedToken,
      balanceETH,
      balanceSelectedToken,
      reserveALVINETH,
      reserveALVINToken,
      reserveSHWEATPANTSETH,
      reserveSHWEATPANTSToken,
      reserveSelectedTokenETH,
      reserveSelectedTokenToken,
      selectedTokenSymbol
    ]
  )

  async function buy(maximumInputValue, outputValue, sellTokenSymbol) {
    const deadline = Math.ceil(Date.now() / 1000) + DEADLINE_FROM_NOW

    const estimatedGasPrice = await library
      .getGasPrice()
      .then(gasPrice => gasPrice.mul(ethers.utils.bigNumberify(150)).div(ethers.utils.bigNumberify(100)))

    if (selectedTokenSymbol === TOKEN_SYMBOLS.ETH) {
      if (sellTokenSymbol === 'SHWEATPANTS') {
        const estimatedGasLimit = await exchangeContractSHWEATPANTS.estimate.ethToTokenSwapOutput(
          outputValue,
          deadline,
          {
            value: maximumInputValue
          }
        )
        return exchangeContractSHWEATPANTS.ethToTokenSwapOutput(outputValue, deadline, {
          value: maximumInputValue,
          gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
          gasPrice: estimatedGasPrice
        })
      } else if (sellTokenSymbol === 'ALVIN') {
        const estimatedGasLimit = await exchangeContractALVIN.estimate.ethToTokenSwapOutput(outputValue, deadline, {
          value: maximumInputValue
        })
        return exchangeContractALVIN.ethToTokenSwapOutput(outputValue, deadline, {
          value: maximumInputValue,
          gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
          gasPrice: estimatedGasPrice
        })
      }
    } else {
      const estimatedGasLimit = await exchangeContractSelectedToken.estimate.tokenToTokenSwapOutput(
        outputValue,
        maximumInputValue,
        ethers.constants.MaxUint256,
        deadline,
        TOKEN_ADDRESSES.SOCKS
      )
      return exchangeContractSelectedToken.tokenToTokenSwapOutput(
        outputValue,
        maximumInputValue,
        ethers.constants.MaxUint256,
        deadline,
        TOKEN_ADDRESSES.SOCKS,
        {
          gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
          gasPrice: estimatedGasPrice
        }
      )
    }
  }

  // sell functionality
  const validateSell = useCallback(
    (numberOfDripp, tokenSymbol) => {
      // validate passed amount
      let parsedValue
      try {
        parsedValue = ethers.utils.parseUnits(numberOfDripp, 18)
      } catch (error) {
        error.code = ERROR_CODES.INVALID_AMOUNT
        throw error
      }

      // how much ETH or tokens the sale will result in
      let requiredValueInSelectedToken
      if (tokenSymbol === 'ALVIN') {
        try {
          requiredValueInSelectedToken = calculateAmount(
            TOKEN_SYMBOLS.ALVIN,
            selectedTokenSymbol,
            parsedValue,
            reserveALVINETH,
            reserveALVINToken,
            reserveSelectedTokenETH,
            reserveSelectedTokenToken
          )
        } catch (error) {
          error.code = ERROR_CODES.INVALID_EXCHANGE
          throw error
        }
      } else if (tokenSymbol === 'SHWEATPANTS') {
        try {
          requiredValueInSelectedToken = calculateAmount(
            TOKEN_SYMBOLS.SHWEATPANTS,
            selectedTokenSymbol,
            parsedValue,
            reserveSHWEATPANTSETH,
            reserveSHWEATPANTSToken,
            reserveSelectedTokenETH,
            reserveSelectedTokenToken
          )
        } catch (error) {
          error.code = ERROR_CODES.INVALID_EXCHANGE
          throw error
        }
      }

      // slippage-ized
      const { minimum } = calculateSlippageBounds(requiredValueInSelectedToken)

      // the following are 'non-breaking' errors that will still return the data
      let errorAccumulator
      // validate minimum ether balance
      if (balanceETH.lt(ethers.utils.parseEther('.01'))) {
        const error = Error()
        error.code = ERROR_CODES.INSUFFICIENT_ETH_GAS
        if (!errorAccumulator) {
          errorAccumulator = error
        }
      }

      // validate minimum SHWEATPANTS balance
      if (balanceSHWEATPANTS.lt(parsedValue)) {
        const error = Error()
        error.code = ERROR_CODES.INSUFFICIENT_SELECTED_TOKEN_BALANCE
        if (!errorAccumulator) {
          errorAccumulator = error
        }
      }
      // validate minimum ALVIN balance
      if (balanceALVIN.lt(parsedValue)) {
        const error = Error()
        error.code = ERROR_CODES.INSUFFICIENT_SELECTED_TOKEN_BALANCE
        if (!errorAccumulator) {
          errorAccumulator = error
        }
      }

      // validate allowance
      if (allowanceSHWEATPANTS.lt(parsedValue)) {
        const error = Error()
        error.code = ERROR_CODES.INSUFFICIENT_ALLOWANCE
        if (!errorAccumulator) {
          errorAccumulator = error
        }
      }

      // validate allowance
      if (allowanceSHWEATPANTS.lt(parsedValue)) {
        const error = Error()
        error.code = ERROR_CODES.INSUFFICIENT_ALLOWANCE
        if (!errorAccumulator) {
          errorAccumulator = error
        }
      }

      return {
        inputValue: parsedValue,
        outputValue: requiredValueInSelectedToken,
        minimumOutputValue: minimum,
        error: errorAccumulator
      }
    },
    [
      allowanceSHWEATPANTS,
      allowanceALVIN,
      balanceETH,
      balanceSHWEATPANTS,
      balanceALVIN,
      reserveSHWEATPANTSETH,
      reserveSHWEATPANTSToken,
      reserveSelectedTokenETH,
      reserveSelectedTokenToken,
      selectedTokenSymbol
    ]
  )

  async function sell(inputValue, minimumOutputValue, buyTokenSymbol) {
    const deadline = Math.ceil(Date.now() / 1000) + DEADLINE_FROM_NOW

    const estimatedGasPrice = await library
      .getGasPrice()
      .then(gasPrice => gasPrice.mul(ethers.utils.bigNumberify(150)).div(ethers.utils.bigNumberify(100)))
    if (buyTokenSymbol === 'ALVIN') {
      if (selectedTokenSymbol === TOKEN_SYMBOLS.ETH) {
        const estimatedGasLimit = await exchangeContractALVIN.estimate.tokenToEthSwapInput(
          inputValue,
          minimumOutputValue,
          deadline
        )
        return exchangeContractALVIN.tokenToEthSwapInput(inputValue, minimumOutputValue, deadline, {
          gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
          gasPrice: estimatedGasPrice
        })
      } else {
        const estimatedGasLimit = await exchangeContractALVIN.estimate.tokenToTokenSwapInput(
          inputValue,
          minimumOutputValue,
          ethers.constants.One,
          deadline,
          TOKEN_ADDRESSES[selectedTokenSymbol]
        )
        return exchangeContractALVIN.tokenToTokenSwapInput(
          inputValue,
          minimumOutputValue,
          ethers.constants.One,
          deadline,
          TOKEN_ADDRESSES[selectedTokenSymbol],
          {
            gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
            gasPrice: estimatedGasPrice
          }
        )
      }
    } else if (buyTokenSymbol === 'SHWEATPANTS') {
      if (selectedTokenSymbol === TOKEN_SYMBOLS.ETH) {
        const estimatedGasLimit = await exchangeContractSHWEATPANTS.estimate.tokenToEthSwapInput(
          inputValue,
          minimumOutputValue,
          deadline
        )
        return exchangeContractSHWEATPANTS.tokenToEthSwapInput(inputValue, minimumOutputValue, deadline, {
          gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
          gasPrice: estimatedGasPrice
        })
      } else {
        const estimatedGasLimit = await exchangeContractSHWEATPANTS.estimate.tokenToTokenSwapInput(
          inputValue,
          minimumOutputValue,
          ethers.constants.One,
          deadline,
          TOKEN_ADDRESSES[selectedTokenSymbol]
        )
        return exchangeContractSHWEATPANTS.tokenToTokenSwapInput(
          inputValue,
          minimumOutputValue,
          ethers.constants.One,
          deadline,
          TOKEN_ADDRESSES[selectedTokenSymbol],
          {
            gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
            gasPrice: estimatedGasPrice
          }
        )
      }
    }
  }

  async function burn(amount, tokenSymbol) {
    const parsedAmount = ethers.utils.parseUnits(amount, 18)

    const estimatedGasPrice = await library
      .getGasPrice()
      .then(gasPrice => gasPrice.mul(ethers.utils.bigNumberify(150)).div(ethers.utils.bigNumberify(100)))
    if (tokenSymbol === 'ALVIN') {
      const estimatedGasLimit = await tokenContractALVIN.estimate.burn(parsedAmount)

      return tokenContractALVIN.burn(parsedAmount, {
        gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
        gasPrice: estimatedGasPrice
      })
    } else if (tokenSymbol === 'SHWEATPANTS') {
      const estimatedGasLimit = await tokenContractSHWEATPANTS.estimate.burn(parsedAmount)

      return tokenContractSHWEATPANTS.burn(parsedAmount, {
        gasLimit: calculateGasMargin(estimatedGasLimit, GAS_MARGIN),
        gasPrice: estimatedGasPrice
      })
    }
  }

  return stats ? (
    <Stats
      reserveSHWEATPANTSToken={reserveSHWEATPANTSToken}
      reserveALVINToken={reserveALVINToken}
      totalSHWEATPANTSSupply={totalSHWEATPANTSSupply}
      totalALVINSupply={totalALVINSupply}
      ready={ready}
      balanceSHWEATPANTS={balanceSHWEATPANTS}
      balanceALVIN={balanceALVIN}
    />
  ) : status ? (
    <Status
      totalSHWEATPANTSSupply={totalSHWEATPANTSSupply}
      totalALVINSupply={totalALVINSupply}
      ready={ready}
      balanceSHWEATPANTS={balanceSHWEATPANTS}
      balanceALVIN={balanceALVIN}
    />
  ) : (
    <Body
      selectedTokenSymbol={selectedTokenSymbol}
      setSelectedTokenSymbol={setSelectedTokenSymbol}
      ready={ready}
      unlock={unlock}
      validateBuy={validateBuy}
      buy={buy}
      validateSell={validateSell}
      sell={sell}
      burn={burn}
      dollarize={dollarize}
      balanceSHWEATPANTS={balanceSHWEATPANTS}
      balanceALVIN={balanceALVIN}
      reserveSHWEATPANTSToken={reserveSHWEATPANTSToken}
      totalSHWEATPANTSSupply={totalSHWEATPANTSSupply}
      reserveALVINToken={reserveALVINToken}
      totalALVINSupply={totalALVINSupply}
    />
  )
}

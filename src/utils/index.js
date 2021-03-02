import { ethers } from 'ethers'

import ERC20_ABI from './erc20.json'
import PAIR_ABI from './pair.json'
import FACTORY_ABI from './factory.json'
import ROUTER_ABI from './router.json'
import STAKING_ABI from './staking.json'

import UncheckedJsonRpcSigner from './signer'

const FACTORY_ADDRESS = '0xA818b4F111Ccac7AA31D0BCc0806d64F2E0737D7'
const ROUTER_ADDRESS = '0x1C232F01118CB8B424793ae03F870aa7D0ac7f77'
export const STAKING_ADDRESS = '0x2ed39a28300D5D37039388eE836EF5e600d8C72F'

export const TOKEN_ADDRESSES = {
  ETH: 'ETH',
  WXDAI: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
  SHWEATPANTS: '0x898e8897437d7245a2d09a29b2cd06a2c1ca388b',
  ALVIN: '0x3008Ff3e688346350b0C07B8265d256dddD97215',
  HNY: '0x71850b7e9ee3f13ab46d67167341e4bdc905eef9',
  PRTCLE: '0xb5d592f85ab2d955c25720ebe6ff8d4d1e1be300'
}

export const STAKING_ADDRESSES = {
  HNY: '0x71850b7e9ee3f13ab46d67167341e4bdc905eef9',
  PRTCLE: '0xb5d592f85ab2d955c25720ebe6ff8d4d1e1be300',
  HNYPRTCLE: '0xaaefc56e97624b57ce98374eb4a45b6fd5ffb982'
}

export const TOKEN_SYMBOLS = Object.keys(TOKEN_ADDRESSES).reduce((o, k) => {
  o[k] = k
  return o
}, {})

export const STAKING_SYMBOLS = Object.keys(STAKING_ADDRESSES).reduce((o, k) => {
  o[k] = k
  return o
}, {})
export const ERROR_CODES = [
  'INVALID_AMOUNT',
  'INVALID_TRADE',
  'INSUFFICIENT_ETH_GAS',
  'INSUFFICIENT_SELECTED_TOKEN_BALANCE',
  'INSUFFICIENT_ALLOWANCE'
].reduce((o, k, i) => {
  o[k] = i
  return o
}, {})

export const TRADE_TYPES = ['BUY', 'SELL', 'UNLOCK', 'REDEEM'].reduce((o, k, i) => {
  o[k] = i
  return o
}, {})

export function isAddress(value) {
  try {
    ethers.utils.getAddress(value)
    return true
  } catch {
    return false
  }
}

// account is optional
export function getProviderOrSigner(library, account) {
  return account ? new UncheckedJsonRpcSigner(library.getSigner(account)) : library
}

// account is optional
export function getContract(address, ABI, library, account) {
  if (!isAddress(address) || address === ethers.constants.AddressZero) {
    throw Error(`Invalid 'address' parameter '${address}'.`)
  }

  return new ethers.Contract(address, ABI, getProviderOrSigner(library, account))
}

export function getTokenContract(tokenAddress, library, account) {
  return getContract(tokenAddress, ERC20_ABI, library, account)
}

export function getPairContract(pairAddress, library, account) {
  return getContract(pairAddress, PAIR_ABI, library, account)
}

export function getRouterContract(library, account) {
  return getContract(ROUTER_ADDRESS, ROUTER_ABI, library, account)
}

export function getStakingContract(library, account) {
  return getContract(STAKING_ADDRESS, STAKING_ABI, library, account)
}

export async function getTokenPairAddressFromFactory(tokenAddressA, tokenAddressB, library, account) {
  return getContract(FACTORY_ADDRESS, FACTORY_ABI, library, account).getPair(tokenAddressA, tokenAddressB)
}

// get the ether balance of an address
export async function getEtherBalance(address, library) {
  if (!isAddress(address)) {
    throw Error(`Invalid 'address' parameter '${address}'`)
  }

  return library.getBalance(address)
}

// get the token balance of an address
export async function getTokenBalance(tokenAddress, address, library) {
  if (!isAddress(tokenAddress) || !isAddress(address)) {
    throw Error(`Invalid 'tokenAddress' or 'address' parameter '${tokenAddress}' or '${address}'.`)
  }

  return getContract(tokenAddress, ERC20_ABI, library).balanceOf(address)
}

export async function getTokenAllowance(address, tokenAddress, spenderAddress, library) {
  if (!isAddress(address) || !isAddress(tokenAddress) || !isAddress(spenderAddress)) {
    throw Error(
      "Invalid 'address' or 'tokenAddress' or 'spenderAddress' parameter" +
        `'${address}' or '${tokenAddress}' or '${spenderAddress}'.`
    )
  }
  return getContract(tokenAddress, ERC20_ABI, library).allowance(address, spenderAddress)
}

export async function getStakedToken(address, tokenAddress, isLiquidity, library) {
  if (!isAddress(address) || !isAddress(tokenAddress)) {
    throw Error("Invalid 'address' or 'tokenAddress' parameter" + `'${address}' or '${tokenAddress}'.`)
  }

  if (isLiquidity) {
    return getContract(STAKING_ADDRESS, STAKING_ABI, library).accountLPStaked(tokenAddress, address)
  } else {
    return getContract(STAKING_ADDRESS, STAKING_ABI, library).accountTokenStaked(tokenAddress, address)
  }
}

export async function getStakedRewards(address, tokenAddress, library) {
  if (!isAddress(address) || !isAddress(tokenAddress)) {
    throw Error("Invalid 'address' or 'tokenAddress' parameter" + `'${address}' or '${tokenAddress}'.`)
  }

  return getContract(STAKING_ADDRESS, STAKING_ABI, library).reward(address, tokenAddress)
}

export async function getTotalStaked(tokenAddress, library) {
  if (!isAddress(tokenAddress)) {
    throw Error("Invalid 'tokenAddress' parameter" + `'${tokenAddress}'.`)
  }

  return getContract(STAKING_ADDRESS, STAKING_ABI, library).totalStaked(tokenAddress)
}

export async function getDrippRate(tokenAddress, library) {
  if (!isAddress(tokenAddress)) {
    throw Error("Invalid 'tokenAddress' parameter" + `'${tokenAddress}'.`)
  }

  return getContract(STAKING_ADDRESS, STAKING_ABI, library).drippRate(tokenAddress)
}

export function amountFormatter(amount, baseDecimals = 18, displayDecimals = 3, useLessThan = true) {
  if (baseDecimals > 18 || displayDecimals > 18 || displayDecimals > baseDecimals) {
    throw Error(`Invalid combination of baseDecimals '${baseDecimals}' and displayDecimals '${displayDecimals}.`)
  }

  // if balance is falsy, return undefined
  if (!amount) {
    return undefined
  }
  // if amount is 0, return
  else if (amount.isZero()) {
    return '0'
  }
  // amount > 0
  else {
    // amount of 'wei' in 1 'ether'
    const baseAmount = ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(baseDecimals))

    const minimumDisplayAmount = baseAmount.div(
      ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(displayDecimals))
    )

    // if balance is less than the minimum display amount
    if (amount.lt(minimumDisplayAmount)) {
      return useLessThan
        ? `<${ethers.utils.formatUnits(minimumDisplayAmount, baseDecimals)}`
        : `${ethers.utils.formatUnits(amount, baseDecimals)}`
    }
    // if the balance is greater than the minimum display amount
    else {
      const stringAmount = ethers.utils.formatUnits(amount, baseDecimals)

      // if there isn't a decimal portion
      if (!stringAmount.match(/\./)) {
        return stringAmount
      }
      // if there is a decimal portion
      else {
        const [wholeComponent, decimalComponent] = stringAmount.split('.')
        const roundUpAmount = minimumDisplayAmount.div(ethers.constants.Two)
        const roundedDecimalComponent = ethers.utils
          .bigNumberify(decimalComponent.padEnd(baseDecimals, '0'))
          .add(roundUpAmount)
          .toString()
          .padStart(baseDecimals, '0')
          .substring(0, displayDecimals)

        // decimals are too small to show
        if (roundedDecimalComponent === '0'.repeat(displayDecimals)) {
          return wholeComponent
        }
        // decimals are not too small to show
        else {
          return `${wholeComponent}.${roundedDecimalComponent.toString().replace(/0*$/, '')}`
        }
      }
    }
  }
}

import React, { useState, useCallback } from 'react'
import styled from 'styled-components'
import { useWeb3Context } from 'web3-react'
import { Link } from 'react-router-dom'

import { useAppContext } from '../../context'
import Card from '../../components/Card'
import { amountFormatter, TOKEN_ADDRESSES, STAKING_ADDRESS, STAKING_ADDRESSES } from '../../utils'
import agaave from '../../components/Gallery/agaave.png'
import SHE from '../../components/Gallery/SHE.png'
import Input from '../../components/Input'
import StakeButton from '../../components/Button'
import { useAddressAllowance, useAddressBalance } from '../../hooks'

export function Header({
  stakedPRTCLEToken,
  stakedHNYToken,
  stakedHNYPRTCLEToken,
  ready,
  balanceSHWEATPANTS,
  balanceALVIN,
  setShowConnect
}) {
  const { account, setConnector } = useWeb3Context()

  function handleAccount() {
    setConnector('Injected', { suppressAndThrowErrors: true }).catch(error => {
      setShowConnect(true)
    })
  }

  return (
    <HeaderFrame balanceSHWEATPANTS={balanceSHWEATPANTS} balanceALVIN={balanceALVIN}>
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
        <Unicorn>
          Shwag{' '}
          <span role="img" aria-label="unicorn">
            🤸‍♀️ | 🐝
          </span>{' '}
          Dripp
        </Unicorn>
      </Link>
      <div style={{ display: 'flex', flexDirection: 'row' }}>
        {stakedPRTCLEToken && (
          <Link to="/stats" style={{ textDecoration: 'none' }}>
            <Staked>
              <span role="img" aria-label="fire">
                🔒
              </span>{' '}
              {stakedPRTCLEToken} <HideMobile>PRTCLE</HideMobile>
            </Staked>
          </Link>
        )}
        {stakedHNYToken && (
          <Link to="/stats" style={{ textDecoration: 'none' }}>
            <Staked>
              <span role="img" aria-label="fire">
                🔒
              </span>{' '}
              {stakedHNYToken} <HideMobile>HNY</HideMobile>
            </Staked>
          </Link>
        )}
        {stakedHNYPRTCLEToken && (
          <Link to="/stats" style={{ textDecoration: 'none' }}>
            <Staked>
              <span role="img" aria-label="fire">
                🔒
              </span>{' '}
              {stakedHNYPRTCLEToken} <HideMobile>HNY-PRTCLE</HideMobile>
            </Staked>
          </Link>
        )}
        <Flex style={{ flexDirection: 'column' }}>
          <Account onClick={() => handleAccount()} balanceSHWEATPANTS={balanceSHWEATPANTS} balanceALVIN={balanceALVIN}>
            {account ? (
              balanceSHWEATPANTS > 0 ? (
                <SockCount>Connected</SockCount>
              ) : (
                <SockCount>{account.slice(0, 6)}...</SockCount>
              )
            ) : (
              <SockCount>Connect Wallet</SockCount>
            )}

            <Status
              balanceSHWEATPANTS={balanceSHWEATPANTS}
              balanceALVIN={balanceALVIN}
              ready={ready}
              account={account}
            />
          </Account>
        </Flex>
      </div>
    </HeaderFrame>
  )
}

const HeaderFrame = styled.div`
  width: 100%;
  box-sizing: border-box;
  margin: 0px;
  font-size: 1.25rem;
  color: ${props => (props.balanceSOCKS ? props.theme.primary : 'white')};
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 1rem;
`

const Account = styled.div`
  background-color: ${props => (props.balanceSOCKS ? '#f1f2f6' : props.theme.blue)};
  padding: 0.75rem;
  border-radius: 6px;
  cursor: ${props => (props.balanceSOCKS ? 'auto' : 'pointer')};

  transform: scale(1);
  transition: transform 0.3s ease;

  :hover {
    transform: ${props => (props.balanceSOCKS ? 'scale(1)' : 'scale(1.02)')};
    text-decoration: underline;
  }
`

const Staked = styled.div`
  background-color: none;
  border: 1px solid red;
  margin-right: 1rem;
  padding: 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transform: scale(1);
  transition: transform 0.3s ease;
  line-height: 1;

  :hover {
    transform: scale(1.02);
  }

  font-weight: 500;
  font-size: 14px;
  color: red;
`

const HideMobile = styled.span`
  @media only screen and (max-width: 480px) {
    display: none;
  }
`

const SockCount = styled.p`
  /* color: #6c7284; */
  font-weight: 500;
  margin: 0px;
  font-size: 14px;
  float: left;
`

const Status = styled.div`
  display: ${props => (props.balanceSOCKS ? 'initial' : 'none')};
  width: 12px;
  height: 12px;
  border-radius: 100%;
  margin-left: 12px;
  margin-top: 2px;
  float: right;
  background-color: ${props =>
    props.account === null ? props.theme.orange : props.ready ? props.theme.green : props.theme.orange};
  // props.account === null ? props.theme.orange : props.theme.green};
`

export default function Staking({
  setStakingSymbols,
  ready,
  unlock,
  stake,
  withdrawTokenStake,
  withdrawLPStake,
  dollarize,
  dollarPrice,
  balanceSHWEATPANTS,
  balanceALVIN,
  reserveSHWEATPANTSToken,
  reserveALVINToken,
  totalSHWEATPANTSSupply,
  totalALVINSupply,
  stakedPRTCLEToken,
  stakedHNYToken,
  stakedHNYPRTCLEToken
}) {
  const { account } = useWeb3Context()
  const [currentTransaction, _setCurrentTransaction] = useState({})
  const setCurrentTransaction = useCallback((hash, type, amount) => {
    _setCurrentTransaction({ hash, type, amount })
  }, [])
  const clearCurrentTransaction = useCallback(() => {
    _setCurrentTransaction({})
  }, [])
  const [state, setState] = useAppContext()
  const [showConnect, setShowConnect] = useState(false)
  const [showWorks, setShowWorks] = useState(false)

  return (
    <AppWrapper overlay={state.visible}>
      <Header
        stakedPRTCLEToken={stakedPRTCLEToken}
        stakedHNYToken={stakedHNYToken}
        stakedHNYPRTCLEToken={stakedHNYPRTCLEToken}
        ready={ready}
        dollarPrice={dollarPrice}
        balanceSHWEATPANTS={balanceSHWEATPANTS}
        balanceALVIN={balanceALVIN}
        setShowConnect={setShowConnect}
      />
      <div>
        <Flex>
          <Content>
            <Card
              totalDrippSupply={totalALVINSupply}
              dollarPrice={dollarPrice}
              reserveDrippToken={reserveALVINToken}
              imageSrc={agaave}
              name={'Alvin'}
              symbol={'$ALVIN'}
            />{' '}
            <Info>
              <div style={{ marginBottom: '4px' }}>Buy and sell real swag with digital currency.</div>
              <div style={{ marginBottom: '4px' }}>
                Delivered on demand.{' '}
                <a
                  href="/"
                  onClick={e => {
                    e.preventDefault()
                    setState(state => ({ ...state, visible: !state.visible }))
                    setShowWorks(true)
                  }}
                >
                  Learn more
                </a>
              </div>
              {/* <SubInfo>
            An experiment in pricing and user experience by the team at Uniswap.{' '}
            <a
              href="/"
              onClick={e => {
                e.preventDefault()
                setState(state => ({ ...state, visible: !state.visible }))
                setShowWorks(true)
              }}
            >
              How it works.
            </a>
          </SubInfo> */}
            </Info>
            <Input
              title={'HNY'}
              background={'radial-gradient(circle at 50% 100%, #ffc3ab, #fafae2 49.48%, #cbf3ef )'}
              balance={useAddressBalance(account, TOKEN_ADDRESSES.HNY)}
              stakedToken={stakedHNYToken}
              stake={stake}
              withdraw={withdrawTokenStake}
              tokenAllowance={useAddressAllowance(STAKING_ADDRESS, TOKEN_ADDRESSES.HNY, account)}
              unlock={unlock}
              tokenSymbol={'HNY'}
            />
          </Content>
          <Content>
            <Card
              totalDrippSupply={totalSHWEATPANTSSupply}
              dollarPrice={dollarPrice}
              reserveDrippToken={reserveSHWEATPANTSToken}
              imageSrc={SHE}
              name={'Shweatpants'}
              symbol={'$SHWEATPANTS'}
            />{' '}
            <Info>
              <div style={{ marginBottom: '4px' }}>Buy and sell real swag with digital currency.</div>
              <div style={{ marginBottom: '4px' }}>
                Delivered on demand.{' '}
                <a
                  href="/"
                  onClick={e => {
                    e.preventDefault()
                    setState(state => ({ ...state, visible: !state.visible }))
                    setShowWorks(true)
                  }}
                >
                  Learn more
                </a>
              </div>
              {/* <SubInfo>
            An experiment in pricing and user experience by the team at Uniswap.{' '}
            <a
              href="/"
              onClick={e => {
                e.preventDefault()
                setState(state => ({ ...state, visible: !state.visible }))
                setShowWorks(true)
              }}
            >
              How it works.
            </a>
          </SubInfo> */}
            </Info>
            <Input
              title={'PRTCLE'}
              background={'radial-gradient(circle at 50% 150%, #ff4, #e6ffff 49.48%, #ff006c )'}
              balance={useAddressBalance(account, TOKEN_ADDRESSES.PRTCLE)}
              stakedToken={stakedPRTCLEToken}
              stake={stake}
              withdraw={withdrawTokenStake}
              account={account}
              tokenSymbol={'PRTCLE'}
              tokenAllowance={useAddressAllowance(STAKING_ADDRESS, TOKEN_ADDRESSES.PRTCLE, account)}
              unlock={unlock}
            />
          </Content>
        </Flex>
        <Input
          title={'HNY-PRTCLE'}
          background={'linear-gradient(107deg,#cbf3ef,#fafae2 49.48%,#ff006c)'}
          balance={useAddressBalance(account, STAKING_ADDRESSES.HNYPRTCLE)}
          tokenSymbol={'HNYPRTCLE'}
          stakedToken={stakedHNYPRTCLEToken}
          stake={stake}
          withdraw={withdrawLPStake}
          tokenAllowance={useAddressAllowance(STAKING_ADDRESS, STAKING_ADDRESSES.HNYPRTCLE, account)}
          unlock={unlock}
          isLiquidity
        />
        <Link to="/" style={{ textDecoration: 'none', cursor: 'pointer' }}>
          <StakeButton text="Back to Buy" style={{ width: '75%', margin: '0 auto' }} />
        </Link>
      </div>
    </AppWrapper>
  )
}

const AppWrapper = styled.div`
  width: 100vw;
  height: 100%;
  margin: 0px auto;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  align-items: center;
  overflow: ${props => (props.overlay ? 'hidden' : 'scroll')};
  scroll-behavior: smooth;
  position: ${props => (props.overlay ? 'fixed' : 'initial')};
`

const Content = styled.div`
  width: calc(100vw - 32px);
  max-width: 375px;
  margin-top: 8px;
`

const Info = styled.div`
  color: ${props => props.theme.text};
  font-weight: 500;
  margin: 0px;
  font-size: 14px;
  padding: 20px;
  padding-top: 32px;
  border-radius: 0 0 8px 8px;
  /* border-radius: 8px; */
  margin-bottom: 12px;
  margin-top: -12px;
  /* margin-top: 16px; */
  background-color: ${props => '#f1f2f6'};
  a {
    color: ${props => props.theme.shenaniganPink};
    text-decoration: none;
    /* padding-top: 8px; */
    /* font-size: 14px; */
  }
  a:hover {
    cursor: pointer;
    text-decoration: underline;
  }
`

const OrderStatusLink = styled.p`
  color: ${props => props.theme.shenaniganPink};
  text-align: center;
  font-size: 0.6rem;
`

const Unicorn = styled.p`
  color: ${props => props.theme.shenaniganPink};
  font-weight: 600;
  margin: auto 0px;
  font-size: 16px;
`

const Flex = styled.div`
  display: flex;
  gap: 32px;
  @media (max-width: 768px) {
    flex-direction: column;
  }
`

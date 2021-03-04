import React, { useState } from 'react'
import styled, { css } from 'styled-components'
import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import Button from '../components/Button'
import { amountFormatter } from '../utils'
import { BigNumber } from 'ethers/utils'

const StakingForm = styled.form`
  display: flex;
  flex: 1;
  width: 100%;
  min-height: 3rem;
`

const Title = styled.p`
  font-weight: 500;
  font-size: 24px;
  line-height: 126.7%;
  width: 100%;
  margin: 0 0 8px 0;
`
const InputWrapper = styled.div`
  /* max-width: 300px; */
  margin-bottom: 24px;

  background: #000000;
  background: linear-gradient(162.92deg, #2b2b2b 12.36%, #000000 94.75%);
  box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  color: black;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: space-between;
  cursor: default;
  padding: 24px;
  z-index: 1;
`

const StakingInfo = styled.p`
  font-weight: 600;
  font-size: 18px;
  margin: 0px;
  margin-bottom: 1rem;
  font-feature-settings: 'tnum' on, 'onum' on;
`

const Input = ({
  tokenSymbol,
  isLiquidity,
  title,
  background,
  balance,
  stakedToken,
  totalStaked,
  stake,
  withdraw,
  tokenAllowance,
  unlock,
  claim,
  rewards,
  rewardSymbol,
  rate
}) => {
  const [stakeAmount, setStakeAmount] = useState(0)
  const one = new BigNumber('1000000000000000000')
  const formattedBalance = balance ? amountFormatter(balance, 18, 18) : 0
  const formattedStakedToken = stakedToken ? amountFormatter(stakedToken) : 0
  console.log('formattedStakedToken: ', formattedStakedToken)
  const formattedRewards = rewards ? amountFormatter(rewards) : 0
  const formattedTotalStaked = totalStaked ? amountFormatter(totalStaked) : 0
  const formattedDrippRate =
    rate && totalStaked
      ? amountFormatter(
          stakedToken
            .div(totalStaked)
            .mul(rate)
            .div(2)
        )
      : 0
  const shouldRenderUnlock = tokenAllowance && tokenAllowance.eq(0)

  return (
    <InputWrapper
      style={{
        borderRadius: '15px',
        background,
        backdropFilter: 'blur(5px)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        <Title>{title}</Title>
        <div>
          <StakingInfo>{formattedDrippRate} per day</StakingInfo>
        </div>
      </div>

      <StakingForm>
        <input
          style={{
            'text-indent': '10px',
            flex: '70 1 auto',
            border: '2px solid whitesmoke',
            borderRadius: '24px',
            height: '2.5rem'
          }}
          placeholder="Input Stake Amount:"
          type="number"
          min="0"
          value={stakeAmount}
          name="name"
          onChange={e => setStakeAmount(e.target.value)}
        />
        <span
          style={{
            display: 'flex',
            flex: '30 1 auto',
            textAlign: 'center',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          onClick={() => {
            setStakeAmount(formattedBalance)
          }}
        >
          <p>Max</p>
        </span>
      </StakingForm>
      <div style={{ flexDirection: 'row', justifyContent: 'flex-start' }}>
        <StakingInfo>
          Available:
          {' ' + formattedBalance}
        </StakingInfo>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
          <StakingInfo>
            Staked:
            {' ' + formattedStakedToken}
          </StakingInfo>
          <StakingInfo>
            % of Pool:
            {' ' + formattedStakedToken / formattedTotalStaked + '%'}
          </StakingInfo>
        </div>
      </div>

      <div
        style={{
          width: '100%',
          height: '20%',
          justifyContent: 'stretch',
          flexDirection: 'row'
        }}
      >
        {!tokenAllowance ? (
          <p>Loading...</p>
        ) : shouldRenderUnlock ? (
          <Button
            text={`Unlock ${tokenSymbol}`}
            type={'cta'}
            onClick={() => {
              unlock(false, tokenSymbol, true)
            }}
          />
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                style={{
                  flex: 1,
                  margin: '0 0.5rem'
                }}
                text="Stake"
                disabled={!stakeAmount || stakeAmount > balance}
                onClick={() => (balance > stakeAmount ? stake(stakeAmount, tokenSymbol, isLiquidity) : null)}
              ></Button>
              <Button
                style={{
                  flex: 1,
                  margin: '0 0.5rem'
                }}
                disabled={stakedToken && stakedToken.eq(0)}
                text="Withdraw"
                onClick={() => withdraw && withdraw(tokenSymbol, isLiquidity)}
              ></Button>
            </div>
          </>
        )}
      </div>
    </InputWrapper>
  )
}

export default Input

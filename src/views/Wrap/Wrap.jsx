import { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Button,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  Link,
  OutlinedInput,
  Paper,
  Tab,
  Tabs,
  Typography,
  Zoom,
  SvgIcon,
  makeStyles,
  Select,
  MenuItem,
} from "@material-ui/core";
import InfoTooltip from "../../components/InfoTooltip/InfoTooltip.jsx";
import { ReactComponent as InfoIcon } from "../../assets/icons/info-fill.svg";
import { getOhmTokenImage, getTokenImage, trim, formatCurrency } from "../../helpers";
import { changeApproval, changeWrap } from "../../slices/WrapThunk";
import { changeMigrationApproval, bridgeBack, migrateWithType } from "../../slices/MigrateThunk";
import "../Stake/stake.scss";
import { useWeb3Context } from "src/hooks/web3Context";
import { isPendingTxn, txnButtonText } from "src/slices/PendingTxnsSlice";
import { Skeleton } from "@material-ui/lab";
import { error } from "../../slices/MessagesSlice";
import { ethers } from "ethers";

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

const sOhmImg = getTokenImage("sohm");
const ohmImg = getOhmTokenImage(16, 16);

const useStyles = makeStyles(theme => ({
  textHighlight: {
    color: theme.palette.highlight,
  },
}));

function Wrap() {
  const dispatch = useDispatch();
  const { provider, address, connected, connect, chainID } = useWeb3Context();

  const [zoomed, setZoomed] = useState(false);
  const [assetFrom, setAssetFrom] = useState("sOHM");
  const [assetTo, setAssetTo] = useState("gOHM");
  const [quantity, setQuantity] = useState("");

  const chooseCurrentAction = () => {
    if (assetFrom === "sOHM") return "Wrap";
    if (assetTo === "sOHM") return "Unwrap";
    if (assetFrom === "wsOHM" && assetTo === "gOHM") return "Wrap";
  };
  const currentAction = chooseCurrentAction();

  const wrapButtonText = assetTo === "gOHM" ? "Wrap to gOHM" : `${currentAction} ${assetFrom}`;

  const classes = useStyles();

  const isAppLoading = useSelector(state => state.app.loading);
  const currentIndex = useSelector(state => {
    return state.app.currentIndex;
  });

  const sOhmPrice = useSelector(state => {
    return state.app.marketPrice;
  });

  const wsOhmPrice = useSelector(state => {
    return state.app.marketPrice * state.app.currentIndex;
  });

  const sohmBalance = useSelector(state => {
    return state.account.balances && state.account.balances.sohm;
  });
  const wsohmBalance = useSelector(state => {
    return state.account.balances && state.account.balances.wsohm;
  });
  const gohmBalance = useSelector(state => {
    return state.account.balances && state.account.balances.gohm;
  });

  const unwrapAllowance = useSelector(state => {
    return state.account.wrapping && state.account.wrapping.ohmUnwrap;
  });

  const migrateSohmAllowance = useSelector(state => {
    return state.account.migration && state.account.migration.sohm;
  });

  const migrateWsohmAllowance = useSelector(state => {
    return state.account.migration && state.account.migration.wsohm;
  });

  const unwrapGohmAllowance = useSelector(state => {
    return state.account.wrapping && state.account.wrapping.gOhmUnwrap;
  });

  const pendingTransactions = useSelector(state => {
    return state.pendingTransactions;
  });

  const setMax = () => {
    if (assetFrom === "sOHM") setQuantity(sohmBalance);
    if (assetFrom === "wsOHM") setQuantity(wsohmBalance);
    if (assetFrom === "gOHM") setQuantity(gohmBalance);
  };

  const onSeekApproval = async token => {
    await dispatch(changeApproval({ address, token, provider, networkID: chainID }));
  };

  const unWrapWSOHM = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(quantity) || Number(quantity) === 0 || quantity === "") {
      // eslint-disable-next-line no-alert
      return dispatch(error("Please enter a value!"));
    }
    if (ethers.utils.parseUnits(quantity, "ether").gt(ethers.utils.parseUnits(wsohmBalance, "ether"))) {
      return dispatch(error("You cannot unwrap more than your wsOHM balance."));
    }

    await dispatch(changeWrap({ address, action: "unwrap", value: quantity.toString(), provider, networkID: chainID }));
  };

  const hasCorrectAllowance = useCallback(() => {
    if (assetFrom === "sOHM" && assetTo === "gOHM") return migrateSohmAllowance > 0;
    if (assetFrom === "wsOHM" && assetTo === "gOHM") return migrateWsohmAllowance > 0;
    if (assetFrom === "wsOHM" && assetTo === "sOHM") return unwrapAllowance > 0;
    if (assetFrom === "gOHM") return unwrapGohmAllowance > 0;

    return 0;
  }, [unwrapAllowance, migrateSohmAllowance, migrateWsohmAllowance, assetTo, assetFrom]);

  const isAllowanceDataLoading = unwrapAllowance == null && currentAction === "Unwrap";

  const convertedQuantity =
    currentAction === "Unwrap" ? (quantity * wsOhmPrice) / sOhmPrice : (quantity * sOhmPrice) / wsOhmPrice;

  let modalButton = [];

  modalButton.push(
    <Button variant="contained" color="primary" className="connect-button" onClick={connect} key={1}>
      Connect Wallet
    </Button>,
  );

  const changeAssetFrom = event => {
    setQuantity("");
    setAssetFrom(event.target.value);
  };

  const changeAssetTo = event => {
    setQuantity("");
    setAssetTo(event.target.value);
  };

  const approveMigrate = token => {
    dispatch(changeMigrationApproval({ token, provider, address, networkID: chainID, displayName: token }));
  };

  const migrateToGohm = type => {
    dispatch(
      migrateWithType({
        provider,
        address,
        networkID: chainID,
        type,
        value: quantity,
        action: "wrap to gOHM",
      }),
    );
  };

  const unwrapGohm = () => {
    dispatch(bridgeBack({ provider, address, networkID: chainID, value: quantity }));
  };

  const approveCorrectToken = () => {
    if (assetFrom === "sOHM" && assetTo === "gOHM") approveMigrate("sohm");
    if (assetFrom === "wsOHM" && assetTo === "gOHM") approveMigrate("wsohm");
    if (assetFrom === "wsOHM" && assetTo === "sOHM") onSeekApproval("wsohm");
    if (assetFrom === "gOHM" && assetTo === "sOHM") approveMigrate("gohm");
  };

  const chooseCorrectWrappingFunction = () => {
    if (assetFrom === "sOHM" && assetTo === "gOHM") migrateToGohm("sohm");
    if (assetFrom === "wsOHM" && assetTo === "gOHM") migrateToGohm("wsohm");
    if (assetFrom === "gOHM" && assetTo === "sOHM") unwrapGohm();
    if (assetFrom === "wsOHM" && assetTo === "sOHM") unWrapWSOHM();
  };

  const chooseInputArea = () => {
    if (!address || isAllowanceDataLoading) return <Skeleton width="150px" />;
    if (assetFrom === assetTo) return "";
    if (assetFrom === "sOHM" && assetTo === "wsOHM")
      return (
        <div className="no-input-visible">
          Wrapping to <b>wsOHM</b> is disabled at this time due to the upcoming{" "}
          <a className="v2-migration-link" href="https://olympusdao.medium.com/introducing-olympus-v2-c4ade14e9fe">
            V2 migration
          </a>
          .
          <br />
          If you'd like to wrap your <b>sOHM</b>, please try wrapping to <b>gOHM</b> instead.
        </div>
      );
    if (!hasCorrectAllowance() && assetTo === "gOHM")
      return (
        <div className="no-input-visible">
          First time wrapping to <b>gOHM</b>?
          <br />
          Please approve Olympus Dao to use your <b>{assetFrom}</b> for this transaction.
        </div>
      );
    if (!hasCorrectAllowance() && assetTo === "sOHM")
      return (
        <div className="no-input-visible">
          First time unwrapping <b>{assetFrom}</b>?
          <br />
          Please approve Olympus Dao to use your <b>{assetFrom}</b> for unwrapping.
        </div>
      );

    return (
      <FormControl className="ohm-input" variant="outlined" color="primary">
        <InputLabel htmlFor="amount-input"></InputLabel>
        <OutlinedInput
          id="amount-input"
          type="number"
          placeholder="Enter an amount"
          className="stake-input"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          labelWidth={0}
          endAdornment={
            <InputAdornment position="end">
              <Button variant="text" onClick={setMax} color="inherit">
                Max
              </Button>
            </InputAdornment>
          }
        />
      </FormControl>
    );
  };

  const chooseButtonArea = () => {
    if (!address) return "";
    if (assetTo === "wsOHM") return "";
    if (assetFrom === assetTo) return "";
    if (!hasCorrectAllowance())
      return (
        <Button
          className="stake-button wrap-page"
          variant="contained"
          color="primary"
          disabled={isPendingTxn(pendingTransactions, "approve_wrapping")}
          onClick={approveCorrectToken}
        >
          {txnButtonText(pendingTransactions, "approve_wrapping", "Approve")}
        </Button>
      );

    if (hasCorrectAllowance())
      return (
        <Button
          className="stake-button wrap-page"
          variant="contained"
          color="primary"
          disabled={isPendingTxn(pendingTransactions, "wrapping")}
          onClick={chooseCorrectWrappingFunction}
        >
          {txnButtonText(pendingTransactions, "wrapping", wrapButtonText)}
        </Button>
      );
  };

  return (
    <div id="stake-view">
      <Zoom in={true} onEntered={() => setZoomed(true)}>
        <Paper className={`ohm-card`}>
          <Grid container direction="column" spacing={2}>
            <Grid item>
              <div className="card-header">
                <Typography variant="h5">Wrap / Unwrap</Typography>
                <Link
                  className="migrate-sohm-button"
                  style={{ textDecoration: "none" }}
                  href={
                    assetTo === "wsOHM"
                      ? "https://docs.olympusdao.finance/main/contracts/tokens#wsohm"
                      : "https://docs.olympusdao.finance/main/contracts/tokens#gohm"
                  }
                  aria-label="wsohm-wut"
                  target="_blank"
                >
                  <Typography>{assetTo}</Typography> <SvgIcon component={InfoIcon} color="primary" />
                </Link>
              </div>
            </Grid>

            <Grid item>
              <div className="stake-top-metrics">
                <Grid container spacing={2} alignItems="flex-end">
                  <Grid item xs={12} sm={4} md={4} lg={4}>
                    <div className="wrap-sOHM">
                      <Typography variant="h5" color="textSecondary">
                        sOHM Price
                      </Typography>
                      <Typography variant="h4">
                        {sOhmPrice ? formatCurrency(sOhmPrice, 2) : <Skeleton width="150px" />}
                      </Typography>
                    </div>
                  </Grid>
                  <Grid item xs={12} sm={4} md={4} lg={4}>
                    <div className="wrap-index">
                      <Typography variant="h5" color="textSecondary">
                        Current Index
                      </Typography>
                      <Typography variant="h4">
                        {currentIndex ? <>{trim(currentIndex, 1)} OHM</> : <Skeleton width="150px" />}
                      </Typography>
                    </div>
                  </Grid>
                  <Grid item xs={12} sm={4} md={4} lg={4}>
                    <div className="wrap-wsOHM">
                      <Typography variant="h5" color="textSecondary">
                        {`${assetTo} Price`}
                        <InfoTooltip
                          message={`${assetTo} = sOHM * index\n\nThe price of ${assetTo} is equal to the price of OHM multiplied by the current index`}
                        />
                      </Typography>
                      <Typography variant="h4">
                        {wsOhmPrice ? formatCurrency(wsOhmPrice, 2) : <Skeleton width="150px" />}
                      </Typography>
                    </div>
                  </Grid>
                </Grid>
              </div>
            </Grid>

            <div className="staking-area">
              {!address ? (
                <div className="stake-wallet-notification">
                  <div className="wallet-menu" id="wallet-menu">
                    {modalButton}
                  </div>
                  <Typography variant="h6">Connect your wallet to wrap sOHM</Typography>
                </div>
              ) : (
                <>
                  <Box className="stake-action-area">
                    <Box style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                      <FormControl style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                        <span className="asset-select-label">{currentAction} from</span>
                        <Select
                          id="asset-select"
                          value={assetFrom}
                          label="Asset"
                          onChange={changeAssetFrom}
                          disableUnderline
                        >
                          <MenuItem value={"sOHM"}>sOHM</MenuItem>
                          <MenuItem value={"wsOHM"}> wsOHM</MenuItem>
                          <MenuItem value={"gOHM"}>gOHM</MenuItem>
                        </Select>
                      </FormControl>
                      <span className="asset-select-label"> to </span>
                      <FormControl style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                        <Select
                          id="asset-select"
                          value={assetTo}
                          label="Asset"
                          onChange={changeAssetTo}
                          disableUnderline
                        >
                          <MenuItem value={"gOHM"}>gOHM</MenuItem>
                          <MenuItem value={"wsOHM"}>wsOHM</MenuItem>
                          <MenuItem value={"sOHM"}>sOHM</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    <Box display="flex" alignItems="center" style={{ paddingBottom: 0 }}>
                      <div className="stake-tab-panel wrap-page">
                        {chooseInputArea()}
                        {/* <Box width="1px" /> */}
                        {chooseButtonArea()}
                      </div>
                    </Box>
                    {/* {quantity && (
                      <Box padding={1}>
                        <Typography variant="body2" className={classes.textHighlight}>
                          {`${currentAction}ping ${quantity} ${assetFrom} will result in ${trim(
                            convertedQuantity,
                            4,
                          )} ${assetTo}`}
                        </Typography>
                      </Box>
                    )} */}
                  </Box>

                  <div className={`stake-user-data`}>
                    <div className="data-row">
                      <Typography variant="body1">sOHM Balance</Typography>
                      <Typography variant="body1">
                        {isAppLoading ? <Skeleton width="80px" /> : <>{trim(sohmBalance, 4)} sOHM</>}
                      </Typography>
                    </div>
                    <div className="data-row">
                      <Typography variant="body1">wsOHM Balance</Typography>
                      <Typography variant="body1">
                        {isAppLoading ? <Skeleton width="80px" /> : <>{trim(wsohmBalance, 4)} wsOHM</>}
                      </Typography>
                    </div>
                    <div className="data-row">
                      <Typography variant="body1">gOHM Balance</Typography>
                      <Typography variant="body1">
                        {isAppLoading ? <Skeleton width="80px" /> : <>{trim(gohmBalance, 4)} gOHM</>}
                      </Typography>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Grid>
        </Paper>
      </Zoom>
    </div>
  );
}

export default Wrap;

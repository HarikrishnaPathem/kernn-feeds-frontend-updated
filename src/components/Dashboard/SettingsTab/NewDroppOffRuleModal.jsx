import React, { useState } from "react";
import styles from "./Settings.module.css";
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogRoot,
  DialogTrigger,
} from "@/components/ui/dialog";
import ErrorModal from "@/components/ErrorModal";
import Loading from "@/components/Loading";
import { useAuth } from "@/Auth";

function NewDroppOffRuleModal() {
  const [maxQuantity, setMaxQuantity] = useState();
  const [maxDropOffPoints, setMaxDropOffPoints] = useState();
  const [unit, setUnit] = useState();
  const [minQunatity, setMinQunatity] = useState();

  const { axiosAPI } = useAuth();
  // validation
  const [errors, setErrors] = useState({});

  const [error, setError] = useState();
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successfull, setSuccessfull] = useState(null);
  const closeModal = () => {
    setIsModalOpen(false);
  };

  const validateFields = () => {
    const newErrors = {};
    if (!maxQuantity) newErrors.maxQuantity = true;
    if (!maxDropOffPoints) newErrors.maxDropOffPoints = true;
    if (!unit) newErrors.unit = true;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  function onError(e, vari, setter) {
    const value = e.target.value === "null" ? null : e.target.value;
    setter(value);
    if (value) {
      setErrors((prev) => ({ ...prev, vari: false }));
    }
  }

  // form subbmission
  const onSubmitClick = () => {
    console.log(maxQuantity, maxDropOffPoints, unit);
    setMinQunatity(minQunatity);
    console.log(minQunatity);

    async function create() {
      try {
        setLoading(true);
        const res = await axiosAPI.post("/drops/rules", {
          maxQuantity,
          maxDropOffPoints,
          unit,
          minQunatity,
        });

        console.log(res);
        setSuccessfull(res.data.message);
        setTimeout(() => setSuccessfull(null), 1000);
      } catch (e) {
        console.log(e);
        setError(e.response.data.message);
        setIsModalOpen(true);
      } finally {
        setLoading(false);
      }
    }

    create();
  };

  return (
    <>
      <DialogRoot placement={"center"} size={"lg"} className={styles.mdl}>
        <DialogTrigger asChild>
          <button className="homebtn">+ Add</button>
        </DialogTrigger>
        <DialogContent className="mdl">
          <DialogBody>
            <h3 className={`px-3 pb-3 mdl-title`}>Create Warehouse</h3>
            {/* <div className="row justify-content-center">
          <div className={`col-4  inputcolumn-mdl`}>
            <label htmlFor="">Warehouse ID :</label>
            <input type="text" />
          </div>
        </div>{" "} */}
            <div className="row justify-content-center">
              <div className={`col-4  inputcolumn-mdl`}>
                <label htmlFor="">Date :</label>
                <input type="date" required />
              </div>
            </div>{" "}
            <div className="row justify-content-center">
              <div className={`col-4  inputcolumn-mdl`}>
                <label htmlFor="">Min. Quantity :</label>
                <input
                  type="text"
                  value={minQunatity}
                  onChange={(e) => onError(e, minQunatity, setMinQunatity)}
                  required
                  className={errors.minQunatity ? styles.errorField : ""}
                />
              </div>
            </div>
            <div className="row justify-content-center">
              <div className={`col-4  inputcolumn-mdl`}>
                <label htmlFor="">Max Quantity :</label>
                <input
                  type="text"
                  value={maxQuantity}
                  onChange={(e) => onError(e, maxQuantity, setMaxQuantity)}
                  required
                  className={errors.maxQuantity ? styles.errorField : ""}
                />
              </div>
            </div>
            <div className="row justify-content-center">
              <div className={`col-4  inputcolumn-mdl`}>
                <label htmlFor="">Max Drop-off Points :</label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={maxDropOffPoints}
                  onChange={(e) =>
                    onError(e, maxDropOffPoints, setMaxDropOffPoints)
                  }
                  required
                  className={errors.maxDropOffPoints ? styles.errorField : ""}
                />
              </div>
            </div>
            <div className="row justify-content-center">
              <div className={`col-4  inputcolumn-mdl`}>
                <label htmlFor="">unit :</label>
                <select
                  name=""
                  id=""
                  onChange={(e) => onError(e, unit, setUnit)}
                  required
                  className={errors.unit ? styles.errorField : ""}
                >
                  <option value="null">--select--</option>
                  <option value="kg">Kgs</option>
                  <option value="ton">Tons</option>
                  <option value="g">Grams</option>
                </select>
              </div>
            </div>
            {!loading && !successfull && (
              <div className="row pt-3 mt-3 justify-content-center">
                <div className={`col-5`}>
                  <button
                    type="submit"
                    className={`submitbtn`}
                    data-bs-dismiss="modal"
                    onClick={onSubmitClick}
                  >
                    Create
                  </button>
                  <DialogActionTrigger asChild>
                    <button
                      type="button"
                      className={`cancelbtn`}
                      data-bs-dismiss="modal"
                    >
                      Close
                    </button>
                  </DialogActionTrigger>
                </div>
              </div>
            )}
            {loading && (
              <div className="row pt-3 mt-3 justify-content-center">
                <div className={`col-5`}>
                  <Loading />
                </div>
              </div>
            )}
            {successfull && (
              <div className="row pt-3 mt-3 justify-content-center">
                <div className={`col-5`}>
                  <DialogActionTrigger asChild>
                    <button
                      type="button"
                      className={`submitbtn`}
                      data-bs-dismiss="modal"
                    >
                      {successfull}
                    </button>
                  </DialogActionTrigger>
                </div>
              </div>
            )}
            {isModalOpen && (
              <ErrorModal
                isOpen={isModalOpen}
                message={error}
                onClose={closeModal}
              />
            )}
          </DialogBody>

          <DialogCloseTrigger className="inputcolumn-mdl-close" />
        </DialogContent>
      </DialogRoot>
    </>
  );
}

export default NewDroppOffRuleModal;
